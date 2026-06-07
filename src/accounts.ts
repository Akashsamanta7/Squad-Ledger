export interface SquadAccount {
  username: string; // acts as the secure document ID in Firestore
  password: string; // hardcoded credentials
  squadName: string; // visible squad name displayed in the UI header
}

// Add, edit, or configure additional squads and credentials right here!
export const HARDCODED_ACCOUNTS: SquadAccount[] = [
  {
    username: "squad1",
    password: "1230X",
    squadName: "Akash's Squad"
  },
  {
    username: "squad2",
    password: "4560X",
    squadName: "Elite Free Fire Squad"
  },
  {
    username: "squad3",
    password: "7890X",
    squadName: "Delta Esports Squad"
  }
];
