export interface SquadAccount {
  username: string; // acts as the secure document ID in Firestore
  password: string; // hardcoded credentials
  squadName: string; // visible squad name displayed in the UI header
}

// Add, edit, or configure additional squads and credentials right here!
export const HARDCODED_ACCOUNTS: SquadAccount[] = [
  {
    username: "akash",
    password: "123",
    squadName: "Akash's Squad"
  },
  {
    username: "squad1",
    password: "456",
    squadName: "Elite Free Fire Squad"
  },
  {
    username: "squad2",
    password: "789",
    squadName: "Delta Esports Squad"
  }
];
