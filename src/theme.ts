// src/theme.ts

import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Projenize özel bir renk paleti tanımlayalım (Mantine'in sitesinden hazır aldım)
const myColor: MantineColorsTuple = [
  '#eef3ff',
  '#dce4f5',
  '#b9c7e2',
  '#94a8d0',
  '#748dc1',
  '#5f7cb8',
  '#5474b4',
  '#4563a0',
  '#3a5890',
  '#2f4b81'
];

export const theme = createTheme({
  // Projenizin ana rengini buradan belirliyoruz
  primaryColor: 'myColor',

  // Renklerimizi Mantine'e tanıtıyoruz
  colors: {
    myColor,
  },

  // Tüm butonların varsayılan olarak nasıl görüneceğini buradan ayarlayabiliriz
  components: {
    Button: {
      defaultProps: {
        radius: 'md', // Tüm butonlar hafif yuvarlak olsun
      },
    },
  },
});