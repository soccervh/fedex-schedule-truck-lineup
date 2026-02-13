export type HomeArea = 'FO' | 'DOC' | 'UNLOAD' | 'PULLER' | 'UNASSIGNED';

export interface TruckData {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
  note?: string;
}

export interface BeltSpot {
  id: number;
  number: number;
  routeOverride?: number | null;
  assignment: {
    id: string;
    truckNumber: string;
    isOverride: boolean;
    user: {
      id: string;
      name: string;
      homeArea: HomeArea;
      role: 'DRIVER' | 'SWING' | 'MANAGER' | 'CSA' | 'HANDLER';
    };
    needsCoverage: boolean;
    originalUserHomeArea?: HomeArea;
  } | null;
  truckAssignment?: {
    id: string;
    truck: TruckData;
  } | null;
}

export interface Belt {
  id: number;
  name: string;
  letter: string;
  baseNumber: number;
  spots: BeltSpot[];
}

export interface FacilitySpot {
  id: number;
  number: number;
  label?: string;
  side?: string;
  assignment: {
    id: string;
    user: {
      id: string;
      name: string;
      homeArea: HomeArea;
      role: 'DRIVER' | 'SWING' | 'MANAGER' | 'CSA' | 'HANDLER';
    };
    needsCoverage?: boolean;
    originalUserHomeArea?: HomeArea;
  } | null;
}

export interface FacilityArea {
  name: string;
  subArea: string | null;
  spots: FacilitySpot[];
}

export interface Truck {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
  note?: string;
  homeSpotId?: number | null;
  homeSpot?: {
    id: number;
    number: number;
    belt: {
      id: number;
      letter: string;
    };
  };
}

export interface SwingDriver {
  id: string;
  name: string;
  homeArea: HomeArea;
}
