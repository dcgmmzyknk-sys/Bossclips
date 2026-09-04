export type Category = 'Boss Mode' | 'Motivation' | 'Funny' | 'Chill';

export type Clip = {
  id: string;
  title: string;
  creator: string;
  caption: string;
  category: Category;
  url: string;
  owner_id?: string | null;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  role: 'user' | 'creator' | 'admin';
  coin_balance: number;
};
