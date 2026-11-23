export type RoomOption = { id: string; roomNumber: string };

export type StaffOption = { id: string; fullName: string; isAvailable: boolean };

export type TaskItem = {
    id: string;
    roomId: string;
    roomNumber: string;
    assignedToId: string | null;
    assignedToName: string | null;
    isMine: boolean;
    status: string;
    notes: string | null;
};

export type MaintenanceItem = {
    id: string;
    roomId: string;
    roomNumber: string;
    description: string;
    status: string;
};