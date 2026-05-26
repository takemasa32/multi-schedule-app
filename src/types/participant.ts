export type Participant = {
  id: string;
  name: string;
  created_at?: string;
  comment?: string | null;
};

export type ParticipantSummary = {
  name: string;
  updated_at?: string;
  comment?: string | null;
};
