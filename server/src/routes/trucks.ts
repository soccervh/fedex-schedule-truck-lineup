import { Router } from 'express';
import { authenticate, requireManager } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Get all trucks
router.get('/', authenticate, async (req, res) => {
  try {
    const trucks = await prisma.truck.findMany({
      include: {
        homeSpot: {
          include: {
            belt: true,
          },
        },
      },
      orderBy: { number: 'asc' },
    });
    res.json(trucks);
  } catch (error) {
    console.error('Get trucks error:', error);
    res.status(500).json({ error: 'Failed to get trucks' });
  }
});

// Get trucks by status
router.get('/status/:status', authenticate, async (req, res) => {
  try {
    const status = req.params.status as string;
    const validStatuses = ['AVAILABLE', 'ASSIGNED', 'OUT_OF_SERVICE'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const trucks = await prisma.truck.findMany({
      where: { status: status as 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE' },
      orderBy: { number: 'asc' },
    });
    res.json(trucks);
  } catch (error) {
    console.error('Get trucks by status error:', error);
    res.status(500).json({ error: 'Failed to get trucks' });
  }
});

// Create a new truck
router.post('/', authenticate, requireManager, async (req, res) => {
  try {
    const { number, status, note, homeSpotId } = req.body;

    if (!number) {
      return res.status(400).json({ error: 'Truck number is required' });
    }

    const truck = await prisma.truck.create({
      data: {
        number,
        status: status || 'AVAILABLE',
        note,
        homeSpotId: homeSpotId ? parseInt(homeSpotId, 10) : null,
      },
      include: {
        homeSpot: {
          include: {
            belt: true,
          },
        },
      },
    });

    res.status(201).json(truck);
  } catch (error) {
    console.error('Create truck error:', error);
    res.status(500).json({ error: 'Failed to create truck' });
  }
});

// Update truck
router.patch('/:id', authenticate, requireManager, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { status, note, homeSpotId } = req.body;

    const truck = await prisma.truck.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(status && { status }),
        ...(note !== undefined && { note }),
        ...(homeSpotId !== undefined && { homeSpotId: homeSpotId ? parseInt(homeSpotId, 10) : null }),
      },
      include: {
        homeSpot: {
          include: {
            belt: true,
          },
        },
      },
    });

    res.json(truck);
  } catch (error) {
    console.error('Update truck error:', error);
    res.status(500).json({ error: 'Failed to update truck' });
  }
});

// Delete a truck
router.delete('/:id', authenticate, requireManager, async (req, res) => {
  try {
    const id = req.params.id as string;

    await prisma.truck.delete({
      where: { id: parseInt(id, 10) },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete truck error:', error);
    res.status(500).json({ error: 'Failed to delete truck' });
  }
});

// ============ Truck Spot Assignments ============

// Get all truck spot assignments for a date
router.get('/spot-assignments', authenticate, async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    const targetDate = new Date(date as string);

    const assignments = await prisma.truckSpotAssignment.findMany({
      where: { date: targetDate },
      include: {
        truck: true,
        spot: {
          include: {
            belt: true,
          },
        },
      },
    });

    res.json(assignments);
  } catch (error) {
    console.error('Get truck spot assignments error:', error);
    res.status(500).json({ error: 'Failed to get truck spot assignments' });
  }
});

// Assign truck to spot
router.post('/spot-assignments', authenticate, requireManager, async (req, res) => {
  try {
    const { truckId, spotId, date } = req.body;

    if (!truckId || !spotId || !date) {
      return res.status(400).json({ error: 'truckId, spotId, and date are required' });
    }

    const targetDate = new Date(date);

    // Check if truck exists
    const truck = await prisma.truck.findUnique({
      where: { id: parseInt(truckId, 10) },
    });

    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    // If truck is out of service, update status to assigned
    if (truck.status === 'OUT_OF_SERVICE') {
      await prisma.truck.update({
        where: { id: truck.id },
        data: { status: 'ASSIGNED', note: '' },
      });
    } else if (truck.status === 'AVAILABLE') {
      await prisma.truck.update({
        where: { id: truck.id },
        data: { status: 'ASSIGNED' },
      });
    }

    // Remove any existing assignment for this truck on this date
    await prisma.truckSpotAssignment.deleteMany({
      where: {
        truckId: parseInt(truckId, 10),
        date: targetDate,
      },
    });

    // Find and remove any existing assignment for this spot on this date
    const existingSpotAssignment = await prisma.truckSpotAssignment.findFirst({
      where: {
        spotId: parseInt(spotId, 10),
        date: targetDate,
      },
    });

    if (existingSpotAssignment) {
      // Delete the existing assignment
      await prisma.truckSpotAssignment.delete({
        where: { id: existingSpotAssignment.id },
      });

      // Move the old truck back to available
      await prisma.truck.update({
        where: { id: existingSpotAssignment.truckId },
        data: { status: 'AVAILABLE' },
      });
    }

    // Create the new assignment
    const assignment = await prisma.truckSpotAssignment.create({
      data: {
        truckId: parseInt(truckId, 10),
        spotId: parseInt(spotId, 10),
        date: targetDate,
      },
      include: {
        truck: true,
        spot: {
          include: {
            belt: true,
          },
        },
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Assign truck to spot error:', error);
    res.status(500).json({ error: 'Failed to assign truck to spot' });
  }
});

// Remove truck from spot
router.delete('/spot-assignments/:id', authenticate, requireManager, async (req, res) => {
  try {
    const id = req.params.id as string;

    const assignment = await prisma.truckSpotAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Delete the assignment
    await prisma.truckSpotAssignment.delete({
      where: { id },
    });

    // Update truck status back to available
    await prisma.truck.update({
      where: { id: assignment.truckId },
      data: { status: 'AVAILABLE' },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Remove truck from spot error:', error);
    res.status(500).json({ error: 'Failed to remove truck from spot' });
  }
});

// Move truck to out of service
router.post('/move-to-out-of-service', authenticate, requireManager, async (req, res) => {
  try {
    const { truckId, date, note } = req.body;

    if (!truckId) {
      return res.status(400).json({ error: 'truckId is required' });
    }

    const truck = await prisma.truck.findUnique({
      where: { id: parseInt(truckId, 10) },
    });

    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    // Remove any spot assignment for this date if provided
    if (date) {
      await prisma.truckSpotAssignment.deleteMany({
        where: {
          truckId: parseInt(truckId, 10),
          date: new Date(date),
        },
      });
    }

    // Update truck status to out of service
    const updatedTruck = await prisma.truck.update({
      where: { id: parseInt(truckId, 10) },
      data: { status: 'OUT_OF_SERVICE', note: note || '' },
    });

    res.json(updatedTruck);
  } catch (error) {
    console.error('Move truck to out of service error:', error);
    res.status(500).json({ error: 'Failed to move truck to out of service' });
  }
});

// Move truck to available (unassign from any spot for the date)
router.post('/move-to-available', authenticate, requireManager, async (req, res) => {
  try {
    const { truckId, date } = req.body;

    if (!truckId) {
      return res.status(400).json({ error: 'truckId is required' });
    }

    const truck = await prisma.truck.findUnique({
      where: { id: parseInt(truckId, 10) },
    });

    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    // Remove any spot assignment for this date if provided
    if (date) {
      await prisma.truckSpotAssignment.deleteMany({
        where: {
          truckId: parseInt(truckId, 10),
          date: new Date(date),
        },
      });
    }

    // Update truck status to available
    const updatedTruck = await prisma.truck.update({
      where: { id: parseInt(truckId, 10) },
      data: { status: 'AVAILABLE', note: '' },
    });

    res.json(updatedTruck);
  } catch (error) {
    console.error('Move truck to available error:', error);
    res.status(500).json({ error: 'Failed to move truck to available' });
  }
});

export default router;
