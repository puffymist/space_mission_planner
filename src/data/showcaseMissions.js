export const SHOWCASE_MISSIONS = [
  {
    label: 'Voyager 1',
    data: {
      version: 3,
      epoch: -657153480.96,
      bookmarks: [
        { epoch: -657233160 },
        { epoch: -603872340 },
      ],
      crafts: [
        {
          name: 'Voyager 1',
          color: '#00ff88',
          originBodyId: 'earth',
          launchEpoch: -704415840,
          orbitAltitude: 18142895.523805074,
          launchDirection: 'prograde',
          launchPhase: 0,
          launchLinkedGroup: 'link-1',
          initialState: {
            x: 144397143213.33246,
            y: -39179761552.793335,
            vx: 9027.102294178976,
            vy: 33269.415920705906,
          },
          events: [
            {
              epoch: -704415840,
              dvx: 1706.1055691540632,
              dvy: 6287.8578235920695,
              spec: { frame: 'velocity', angle: 0, magnitude: 6515.2093, refBody: 'earth' },
              linkedGroup: 'link-1',
            },
            {
              epoch: -704415840,
              dvx: 4725.085529646123,
              dvy: -1282.0733170224948,
              spec: { frame: 'velocity', angle: 270, magnitude: 4895.9315, refBody: 'earth' },
              linkedGroup: 'link-1',
            },
          ],
        },
      ],
    },
  },
  {
    label: 'Voyager 2 (in progress)',
    data: {
      version: 3,
      epoch: -646443540,
      bookmarks: [
        { epoch: -646443540 },
        { epoch: -579436383 },
        { epoch: -439758600 },
        { epoch: -326707404 },
      ],
      crafts: [
        {
          name: 'Craft 1',
          color: '#00ff88',
          originBodyId: 'earth',
          launchEpoch: -705792600,
          orbitAltitude: 18142895.523805074,
          launchDirection: 'prograde',
          launchPhase: 0,
          launchLinkedGroup: 'link-1',
          initialState: {
            x: 128400608094.72307,
            y: -76804117887.06853,
            vx: 17695.835842352604,
            vy: 29583.779430204646,
          },
          events: [
            {
              epoch: -705792600,
              dvx: 3388.8274164539207,
              dvy: 5665.418899030349,
              spec: { frame: 'velocity', angle: 0, magnitude: 6601.6, refBody: 'earth' },
              linkedGroup: 'link-1',
            },
            {
              epoch: -705792600,
              dvx: 835.017660681733,
              dvy: -499.4742299154243,
              spec: { frame: 'velocity', angle: 270, magnitude: 973, refBody: 'earth' },
              linkedGroup: 'link-1',
            },
          ],
        },
      ],
    },
  },
];
