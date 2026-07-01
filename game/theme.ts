import * as THREE from 'three'

export type ThemeType = 'neon' | 'monochrome' | 'cyber' | 'sunset' | 'cosmic' | 'toxic' | 'frost' | 'vaporwave' | 'inferno' | 'sakura' | 'retro_future'

export type EffectType = 'bloom' | 'hyper_glow' | 'crt' | 'aberration'

export interface EffectConfig {
  id: EffectType
  name: string
  description: string
}

export const EFFECTS: EffectConfig[] = [
  { id: 'bloom', name: 'Cinematic Bloom', description: 'Soft filmic glow' },
  { id: 'hyper_glow', name: 'Hyper-Glow', description: 'Max neon bloom' },
  { id: 'crt', name: 'Retro CRT', description: 'Curved scanlines and flicker' },
  { id: 'aberration', name: 'Cyber Glitch', description: 'Chromatic edge splitting' },
]

export interface ThemeConfig {
  name: string
  player1Color: number
  player1ColorDark: number
  player2Color: number
  player2ColorDark: number
  unclaimedPathColor: number
  gridColor: number
  gridPointsColor: number
  backgroundColor: number
  starColor: number
  hudBg: string
  hudBorder: string
  hudText: string
  themeAccent: string
  accentRgb: string
}

export const THEMES: Record<ThemeType, ThemeConfig> = {
  neon: {
    name: 'Neon',
    player1Color: 0xff00ff,
    player1ColorDark: 0xad0dba,
    player2Color: 0x00ffff,
    player2ColorDark: 0x0492c2,
    unclaimedPathColor: 0x8888ff,
    gridColor: 0x333377,
    gridPointsColor: 0x5555aa,
    backgroundColor: 0x000011,
    starColor: 0x888888,
    hudBg: 'rgba(10, 25, 47, 0.6)',
    hudBorder: 'rgba(51, 51, 119, 0.5)',
    hudText: '#ffffff',
    themeAccent: '#ff00ff',
    accentRgb: '255, 0, 255',
  },
  monochrome: {
    name: 'Monochrome',
    player1Color: 0xffffff,
    player1ColorDark: 0x888888,
    player2Color: 0x555555,
    player2ColorDark: 0x222222,
    unclaimedPathColor: 0x777777,
    gridColor: 0x333333,
    gridPointsColor: 0x444444,
    backgroundColor: 0x0b0b0b,
    starColor: 0x333333,
    hudBg: 'rgba(15, 15, 15, 0.85)',
    hudBorder: 'rgba(156, 163, 175, 0.2)',
    hudText: '#f3f4f6',
    themeAccent: '#ffffff',
    accentRgb: '255, 255, 255',
  },
  cyber: {
    name: 'Cyber',
    player1Color: 0x39ff14, // matrix green
    player1ColorDark: 0x00aa00,
    player2Color: 0xffb000, // amber
    player2ColorDark: 0xaa7700,
    unclaimedPathColor: 0x118811,
    gridColor: 0x003300,
    gridPointsColor: 0x00aa00,
    backgroundColor: 0x000a02,
    starColor: 0x006600,
    hudBg: 'rgba(0, 10, 2, 0.85)',
    hudBorder: 'rgba(0, 170, 0, 0.3)',
    hudText: '#39ff14',
    themeAccent: '#39ff14',
    accentRgb: '57, 255, 20',
  },
  sunset: {
    name: 'Sunset',
    player1Color: 0xff007f, // Hot pink
    player1ColorDark: 0xaa0055,
    player2Color: 0xff7a00, // Sunset orange
    player2ColorDark: 0xaa5500,
    unclaimedPathColor: 0x773355,
    gridColor: 0x441133,
    gridPointsColor: 0x882266,
    backgroundColor: 0x150510,
    starColor: 0x884477,
    hudBg: 'rgba(25, 5, 20, 0.85)',
    hudBorder: 'rgba(255, 0, 127, 0.3)',
    hudText: '#ff007f',
    themeAccent: '#ff007f',
    accentRgb: '255, 0, 127',
  },
  cosmic: {
    name: 'Cosmic',
    player1Color: 0x7b2cbf, // Deep cosmic purple
    player1ColorDark: 0x5a189a,
    player2Color: 0xffb703, // Cosmic gold
    player2ColorDark: 0xfb8500,
    unclaimedPathColor: 0x48cae4, // Nebula blue
    gridColor: 0x03045e,
    gridPointsColor: 0x0077b6,
    backgroundColor: 0x010008,
    starColor: 0x90e0ef,
    hudBg: 'rgba(5, 0, 15, 0.85)',
    hudBorder: 'rgba(123, 44, 191, 0.3)',
    hudText: '#e0aaff',
    themeAccent: '#7b2cbf',
    accentRgb: '123, 44, 191',
  },
  toxic: {
    name: 'Toxic',
    player1Color: 0xadff2f, // Green yellow / toxic
    player1ColorDark: 0x00ff00,
    player2Color: 0x9400d3, // poison purple
    player2ColorDark: 0x4b0082,
    unclaimedPathColor: 0x32cd32,
    gridColor: 0x002200,
    gridPointsColor: 0x00ff00,
    backgroundColor: 0x020a02,
    starColor: 0x00ff00,
    hudBg: 'rgba(2, 10, 2, 0.85)',
    hudBorder: 'rgba(173, 255, 47, 0.3)',
    hudText: '#adff2f',
    themeAccent: '#adff2f',
    accentRgb: '173, 255, 47',
  },
  frost: {
    name: 'Frost',
    player1Color: 0xa5f3fc, // Ice blue
    player1ColorDark: 0x0891b2,
    player2Color: 0xf8fafc, // Frost white
    player2ColorDark: 0x64748b,
    unclaimedPathColor: 0x38bdf8,
    gridColor: 0x0f172a,
    gridPointsColor: 0x1e293b,
    backgroundColor: 0x020617,
    starColor: 0x38bdf8,
    hudBg: 'rgba(15, 23, 42, 0.85)',
    hudBorder: 'rgba(165, 243, 252, 0.3)',
    hudText: '#e2e8f0',
    themeAccent: '#a5f3fc',
    accentRgb: '165, 243, 252',
  },
  vaporwave: {
    name: 'Vaporwave',
    player1Color: 0xff71ce, // hot pink
    player1ColorDark: 0xb90076,
    player2Color: 0x01cdfe, // bright cyan/teal
    player2ColorDark: 0x008fa7,
    unclaimedPathColor: 0x05ffa1, // vaporwave green
    gridColor: 0x3d1a4d, // deep dark purple grid
    gridPointsColor: 0xb967ff, // neon purple points
    backgroundColor: 0x1a052e, // retro dark purple bg
    starColor: 0xfff3a0, // warm sunset yellow stars
    hudBg: 'rgba(26, 5, 46, 0.85)',
    hudBorder: 'rgba(255, 113, 206, 0.4)',
    hudText: '#ff71ce',
    themeAccent: '#ff71ce',
    accentRgb: '255, 113, 206',
  },
  inferno: {
    name: 'Inferno',
    player1Color: 0xff3300, // raging orange-red
    player1ColorDark: 0x990000,
    player2Color: 0xffaa00, // molten lava yellow-gold
    player2ColorDark: 0xb55300,
    unclaimedPathColor: 0x7a2200,
    gridColor: 0x2b0700,
    gridPointsColor: 0xff5500,
    backgroundColor: 0x0c0100, // pitch black volcanic bg
    starColor: 0xffaa00,
    hudBg: 'rgba(15, 1, 0, 0.85)',
    hudBorder: 'rgba(255, 51, 0, 0.4)',
    hudText: '#ff3300',
    themeAccent: '#ff3300',
    accentRgb: '255, 51, 0',
  },
  sakura: {
    name: 'Sakura',
    player1Color: 0xffb7c5, // sakura blossom pink
    player1ColorDark: 0xe07a8c,
    player2Color: 0xffffff, // pure white petal
    player2ColorDark: 0xcccccc,
    unclaimedPathColor: 0xffe3e8, // extremely soft pink
    gridColor: 0x42262d, // dark wood branch
    gridPointsColor: 0xffc0cb, // glowing pink points
    backgroundColor: 0x1a0f12, // midnight cherry orchard
    starColor: 0xffe3e8,
    hudBg: 'rgba(26, 15, 18, 0.85)',
    hudBorder: 'rgba(255, 183, 197, 0.4)',
    hudText: '#ffb7c5',
    themeAccent: '#ffb7c5',
    accentRgb: '255, 183, 197',
  },
  retro_future: {
    name: 'Outrun',
    player1Color: 0xfd0061, // neon magenta
    player1ColorDark: 0xa1003c,
    player2Color: 0x2a00ff, // neon laser blue
    player2ColorDark: 0x0e0085,
    unclaimedPathColor: 0x00f0ff, // neon cyan
    gridColor: 0x1e0029, // dark synthwave grid
    gridPointsColor: 0xbd00ff, // purple points
    backgroundColor: 0x05000a,
    starColor: 0xfd0061,
    hudBg: 'rgba(5, 0, 10, 0.85)',
    hudBorder: 'rgba(253, 0, 97, 0.4)',
    hudText: '#fd0061',
    themeAccent: '#fd0061',
    accentRgb: '253, 0, 97',
  },
}
