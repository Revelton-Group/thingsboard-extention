/**
 * Room and location domain models.
 */

export interface Room {
  name: string;
  type: 'Suite' | 'Deluxe' | 'Standard';
}

export interface FloorGroup {
  floor: string;
  rooms: Room[];
}

export interface RoomDetails {
  name: string;
  floor: string;
  type: string;
}

export const DEFAULT_ROOM_DETAILS = (): RoomDetails => ({
  name: '', floor: '', type: 'Standard',
});
