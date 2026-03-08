import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Space Mission Planner',
  description: 'Plan interplanetary missions in your browser',
  base: '/space_mission_planner/docs/',

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Concepts', link: '/concepts/orbital-mechanics' },
      { text: 'Launch App', link: 'https://puffymist.github.io/space_mission_planner/' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Launching Spacecraft', link: '/guide/launching-spacecraft' },
          { text: 'Planning Maneuvers', link: '/guide/planning-maneuvers' },
          { text: 'Transfer Orbits', link: '/guide/transfer-orbits' },
          { text: 'Camera & Navigation', link: '/guide/camera-controls' },
          { text: 'Import & Export', link: '/guide/import-export' },
        ],
      },
      {
        text: 'Concepts',
        items: [
          { text: 'Orbital Mechanics', link: '/concepts/orbital-mechanics' },
          { text: 'Hohmann Transfers', link: '/concepts/hohmann-transfers' },
          { text: 'Bi-Elliptic Transfers', link: '/concepts/bi-elliptic-transfers' },
          { text: 'Delta-V', link: '/concepts/delta-v' },
          { text: 'Reference Frames', link: '/concepts/reference-frames' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/puffymist/space_mission_planner' },
    ],
  },
})
