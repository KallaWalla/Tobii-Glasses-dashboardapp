export type FrameState = {
  frameIdx: number;
  setFrameIdx: React.Dispatch<React.SetStateAction<number>>;
  timeline: any;
  onSeek: (frame: number) => Promise<void>;
};