declare module 'wavefunctioncollapse' {
  export interface TileData {
    name: string;
    symmetry: string;
    weight?: number;
    bitmap: number[];
  }

  export interface Neighbor {
    left: string;
    right: string;
  }

  export interface TilesetData {
    tilesize: number;
    tiles: TileData[];
    neighbors: Neighbor[];
    subsets?: Record<string, string[]>;
  }

  export class SimpleTiledModel {
    constructor(
      data: TilesetData,
      subsetName: string | null,
      width: number,
      height: number,
      periodic: boolean
    );

    generate(rng?: () => number): boolean;
    iterate(iterations: number, rng?: () => number): boolean;
    isGenerationComplete(): boolean;
    clear(): void;
    graphics(array?: Uint8Array | Uint8ClampedArray, defaultColor?: number[]): Uint8Array | Uint8ClampedArray;
  }

  export class OverlappingModel {
    constructor(
      data: Uint8Array | Uint8ClampedArray,
      dataWidth: number,
      dataHeight: number,
      N: number,
      width: number,
      height: number,
      periodicInput: boolean,
      periodicOutput: boolean,
      symmetry: number,
      ground?: number
    );

    generate(rng?: () => number): boolean;
    iterate(iterations: number, rng?: () => number): boolean;
    isGenerationComplete(): boolean;
    clear(): void;
    graphics(array?: Uint8Array | Uint8ClampedArray): Uint8Array | Uint8ClampedArray;
  }

  const WFC: {
    SimpleTiledModel: typeof SimpleTiledModel;
    OverlappingModel: typeof OverlappingModel;
  };

  export default WFC;
}
