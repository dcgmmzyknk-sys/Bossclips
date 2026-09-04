export type Clip = {
  id: string;
  title: string;
  creator: string;
  caption: string;
  category: 'Boss Mode' | 'Motivation' | 'Funny' | 'Chill';
  url: string;
};

export const clips: Clip[] = [
  {
    id: '1',
    title: 'Big Buck Bunny',
    creator: '@bossclips',
    caption: 'Build the habit. Stack the wins. 👑',
    category: 'Boss Mode',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  },
  {
    id: '2',
    title: 'Elephants Dream',
    creator: '@dailyboss',
    caption: 'Keep moving — momentum beats motivation.',
    category: 'Motivation',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
  },
  {
    id: '3',
    title: 'For Bigger Blazes',
    creator: '@bossfun',
    caption: 'A quick clip for your break 😄',
    category: 'Funny',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  },
  {
    id: '4',
    title: 'For Bigger Escapes',
    creator: '@bosschill',
    caption: 'Reset. Recharge. Go again.',
    category: 'Chill',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
  }
];
