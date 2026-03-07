import { Router } from 'express';
import { authenticate, requireAccessLevel } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { getAllowedSchedules } from './routes';

const router = Router();

// Get all facility areas with spots and assignments for a specific date
router.get('/areas', authenticate, async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    const targetDate = new Date(date as string);

    const facilityAreas = await prisma.facilityArea.findMany({
      include: {
        spots: {
          orderBy: { number: 'asc' },
          include: {
            assignments: {
              where: { date: targetDate },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    // Get time-off for assigned users on this date
    const assignedUserIds = facilityAreas
      .flatMap(area => area.spots)
      .flatMap(s => s.assignments)
      .map(a => a.userId);

    const timeOffs = await prisma.timeOff.findMany({
      where: {
        userId: { in: assignedUserIds },
        date: targetDate,
        status: 'APPROVED',
      },
    });

    const timeOffUserIds = new Set(timeOffs.map(t => t.userId));

    // Group areas by name and subArea
    const groupedAreas: Record<string, {
      name: string;
      subArea: string | null;
      spots: Array<{
        id: number;
        number: number;
        label: string | null;
        side: string | null;
        assignment: {
          id: string;
          user: {
            id: string;
            name: string;
            role: string;
          };
          needsCoverage: boolean;
        } | null;
      }>;
    }> = {};

    for (const area of facilityAreas) {
      const key = `${area.name}-${area.subArea || 'default'}`;
      groupedAreas[key] = {
        name: area.name,
        subArea: area.subArea,
        spots: area.spots.map(spot => {
          const assignment = spot.assignments[0];
          const isOff = assignment ? timeOffUserIds.has(assignment.userId) : false;

          return {
            id: spot.id,
            number: spot.number,
            label: spot.label,
            side: spot.side,
            assignment: assignment
              ? {
                  id: assignment.id,
                  user: assignment.user,
                  needsCoverage: isOff,
                }
              : null,
          };
        }),
      };
    }

    res.json(groupedAreas);
  } catch (error) {
    console.error('Get facility areas error:', error);
    res.status(500).json({ error: 'Failed to get facility areas' });
  }
});

// Create or update facility assignment
router.post('/assignments', authenticate, requireAccessLevel('OP_LEAD'), async (req, res) => {
  try {
    const { facilitySpotId, userId, date } = req.body;

    if (!facilitySpotId || !userId || !date) {
      return res.status(400).json({ error: 'facilitySpotId, userId, and date are required' });
    }

    const targetDate = new Date(date);

    const assignment = await prisma.facilityAssignment.upsert({
      where: {
        facilitySpotId_date: {
          facilitySpotId,
          date: targetDate,
        },
      },
      update: { userId },
      create: {
        facilitySpotId,
        userId,
        date: targetDate,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    res.json(assignment);
  } catch (error) {
    console.error('Create facility assignment error:', error);
    res.status(500).json({ error: 'Failed to create facility assignment' });
  }
});

// Delete facility assignment
router.delete('/assignments/:assignmentId', authenticate, requireAccessLevel('OP_LEAD'), async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId as string;

    await prisma.facilityAssignment.delete({
      where: { id: assignmentId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete facility assignment error:', error);
    res.status(500).json({ error: 'Failed to delete facility assignment' });
  }
});

// Get routes assigned to UNLOAD/DOCK areas with driver info for a given date
router.get('/route-assignments', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    const targetDate = new Date(date as string);

    const routes = await prisma.route.findMany({
      where: {
        isActive: true,
        loadLocation: { not: null },
      },
      include: {
        facilitySpot: {
          include: {
            area: true,
          },
        },
        beltSpot: true,
      },
      orderBy: { number: 'asc' },
    });


    // For routes with a beltSpotId, find the assignment on that belt spot for this date to get the driver
    const beltSpotIds = routes.filter(r => r.beltSpotId).map(r => r.beltSpotId!);
    const beltAssignments = beltSpotIds.length > 0
      ? await prisma.assignment.findMany({
          where: {
            spotId: { in: beltSpotIds },
            date: targetDate,
          },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        })
      : [];

    const beltAssignmentBySpot = new Map(
      beltAssignments.map(a => [a.spotId, a])
    );

    // Check time-off for drivers
    const driverUserIds = beltAssignments.map(a => a.userId);
    const timeOffs = driverUserIds.length > 0
      ? await prisma.timeOff.findMany({
          where: {
            userId: { in: driverUserIds },
            date: targetDate,
            status: 'APPROVED',
          },
        })
      : [];
    const timeOffUserIds = new Set(timeOffs.map(t => t.userId));

    // Map loadLocation to section
    const SORT_LOCATIONS = new Set(['SORT', 'LABEL_FACER', 'SCANNER', 'SPLITTER']);
    function getSection(loadLocation: string): string {
      if (loadLocation === 'FO') return 'FO';
      if (loadLocation === 'DOC') return 'DOC';
      if (loadLocation === 'UNLOAD') return 'UNLOAD';
      if (SORT_LOCATIONS.has(loadLocation)) return 'SORT';
      return 'SORT'; // default fallback
    }

    const result: Record<string, any[]> = { FO: [], DOC: [], UNLOAD: [], SORT: [] };

    for (const route of routes) {
      const beltAssignment = route.beltSpotId
        ? beltAssignmentBySpot.get(route.beltSpotId)
        : null;

      const driver = beltAssignment
        ? { id: beltAssignment.user.id, name: beltAssignment.user.name, role: beltAssignment.user.role }
        : null;

      const driverIsOff = beltAssignment
        ? timeOffUserIds.has(beltAssignment.userId)
        : false;

      const section = getSection(route.loadLocation!);
      result[section].push({
        id: route.id,
        number: route.number,
        facilitySpotId: route.facilitySpotId,
        driver,
        driverIsOff,
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Get route assignments error:', error);
    res.status(500).json({ error: 'Failed to get route assignments' });
  }
});

// Assign a route to a facility spot
router.post('/assign-route-spot', authenticate, requireAccessLevel('OP_LEAD'), async (req, res) => {
  try {
    const { routeId, facilitySpotId } = req.body;

    if (!routeId) {
      return res.status(400).json({ error: 'routeId is required' });
    }

    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    if (!route.loadLocation) {
      return res.status(400).json({ error: 'Route must have a loadLocation' });
    }

    // Map loadLocation to expected area name
    const SORT_LOCATIONS = new Set(['LABEL_FACER', 'SCANNER', 'SPLITTER']);
    function loadLocationToArea(ll: string): string {
      if (ll === 'FO') return 'FO';
      if (ll === 'DOC') return 'DOC';
      if (ll === 'UNLOAD') return 'UNLOAD';
      if (SORT_LOCATIONS.has(ll)) return 'SORT';
      return 'SORT';
    }

    if (facilitySpotId !== null && facilitySpotId !== undefined) {
      // Validate the facility spot belongs to the matching area
      const spot = await prisma.facilitySpot.findUnique({
        where: { id: facilitySpotId },
        include: { area: true },
      });
      if (!spot) {
        return res.status(404).json({ error: 'Facility spot not found' });
      }

      const expectedArea = loadLocationToArea(route.loadLocation);
      const areaMatch = spot.area.name === expectedArea;
      if (!areaMatch) {
        return res.status(400).json({ error: 'Facility spot area does not match route loadLocation' });
      }

      // Clear any other route pointing to this facility spot
      await prisma.route.updateMany({
        where: { facilitySpotId, id: { not: routeId } },
        data: { facilitySpotId: null },
      });
    }

    const updated = await prisma.route.update({
      where: { id: routeId },
      data: { facilitySpotId: facilitySpotId ?? null },
    });

    res.json(updated);
  } catch (error) {
    console.error('Assign route spot error:', error);
    res.status(500).json({ error: 'Failed to assign route to facility spot' });
  }
});

export default router;
