export type Config = {
  primitives: string[];
  themes: Theme[];
};

export type Theme = {
  name: string;
  selector: string;
};
