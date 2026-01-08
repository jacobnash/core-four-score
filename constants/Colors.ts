const palette = {
  brandOrange: '#FF6700',
  forest: '#013220',
  pine: '#0B3B2E',
  cream: '#F5F5DC',
  gold: '#F4C95D',
};

export default {
  light: {
    text: palette.forest,
    background: palette.cream,
    tint: palette.brandOrange,
    tabIconDefault: '#C8C8C8',
    tabIconSelected: palette.brandOrange,
  },
  dark: {
    text: palette.cream,
    background: palette.pine,
    tint: palette.gold,
    tabIconDefault: '#667066',
    tabIconSelected: palette.gold,
  },
};
