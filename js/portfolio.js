// Your Minecraft portfolio. Edit this file and the page updates, nothing else to touch.
//
// Every field is optional. Empty ones are simply not shown, and a project with
// nothing filled in shows a "details coming soon" card.
//
// Fields per project:
//   tagline, description (blank line = new paragraph), address (shown with a copy button),
//   stats [{label, value}], tags [string], links [{label, href}],
//   sections [{ title, intro?, items: [{ title, text }] }],
//   images [{ src, alt }]
//
// Links must be https:// URLs. Images can be https:// URLs or files you commit to
// this repo, e.g. 'assets/csmp-spawn.jpg'. Everything is plain text, no markdown or HTML.
export const PORTFOLIO = {
  intro:
    'Two Minecraft servers that work as one network. Players move between them without a proxy, and moderation and announcements work on both.',

  // Shown as a card above the projects. Not in the jump buttons.
  network: {
    id: 'network',
    name: 'One network, two engines',
    tagline: 'The first Minestom and Paper ecosystem: a hub and a plugin that talk to each other using nothing but the Minecraft protocol.',
    description: [
      'This is the first time a Minestom server and a Paper plugin have communicated like this to form one ecosystem. CMinigames runs on Minestom, a bare protocol library with no gameplay of its own, and CSMP runs on Paper, which is full vanilla. Two very different engines, and the hub and the SMP plugin signal each other directly, in both directions.',
      'There is no proxy and no separate messaging layer between them. They use only what the Minecraft protocol already provides: the server-list ping, client cookies and transfer packets. That is enough for one maintenance schedule that warns both servers, and a restart countdown that reconnects players when the SMP comes back.',
    ].join('\n\n'),
    stats: [],
    tags: ['Minestom', 'Paper', 'No proxy', 'Server-list ping', 'Cookies'],
    links: [],
    sections: [
      {
        title: 'How the two talk',
        items: [
          {
            title: 'Hub to SMP: the server-list ping',
            text: 'The servers have no link to each other, so the hub publishes its maintenance schedule inside its server-list ping as maint:<epochMillis>:<scope>. The Paper plugin pings the hub every thirty seconds and adopts whatever it finds.',
          },
          {
            title: 'SMP to hub: hand-off and reason',
            text: 'When the SMP stops, the plugin transfers everyone to the hub and passes the reason in a client cookie, because chat is wiped by the hop. The hub reads it on arrival and shows an "SMP restarting" countdown that reconnects each player once the SMP answers a ping again.',
          },
          {
            title: 'Kept in step',
            text: 'Maintenance is scheduled once. Both servers show a countdown boss bar, and only the server actually named stops, which also decides whether SMP players are transferred to the hub or kicked with the reason.',
          },
          {
            title: 'One set of tools',
            text: 'The Paper plugin has its own staff tools, so punishments, mutes, announcements and scheduled maintenance work the same on both sides.',
          },
        ],
      },
      {
        title: 'Why it is awkward',
        items: [
          { title: 'Opposite engines', text: 'Minestom implements the protocol and nothing else, so every mechanic on the hub was written for it. Paper brings all of vanilla. Making them feel like one place means matching behaviour across two codebases that share nothing.' },
          { title: 'Shutdown order', text: 'Paper disables plugins before it kicks players, so the plugin has to hand everyone to the hub in that window, or they land on a disconnect screen.' },
        ],
      },
    ],
    images: [],
  },

  projects: [
    {
      id: 'csmp',
      name: 'CSMP',
      tagline: 'Survival where the admins do not play survival.',
      description: [
        'A survival server with a fair-play first design. Admins do not play survival, the server runs next-generation anticheat and plugins that lower lag while protecting legit players, and bad players are actively punished.',
        'It runs on Paper and is tied to the CMinigames hub by a companion plugin, so players can hop between the two and staff use the same tools on both.',
      ].join('\n\n'),
      address: 'smp.itscalan.org',
      stats: [
        { label: 'Plugin code', value: '~1.6K lines' },
        { label: 'Plugin classes', value: '6' },
        { label: 'Paper API', value: '26.3' },
      ],
      tags: ['Survival', 'Paper', 'Anticheat', 'Low lag', 'Staff do not play'],
      links: [],
      sections: [
        {
          title: 'Fair play',
          items: [
            { title: 'Admins stay out of survival', text: 'Staff run the server, they do not play on it.' },
            { title: 'Next-gen anticheat and plugins', text: 'Chosen to stop cheaters without getting in the way of legit players.' },
            { title: 'Lower lag', text: 'The plugin stack is built to cut lag, not add to it.' },
            { title: 'Bad players actively punished', text: 'Cheaters are dealt with, not left to ruin the world for everyone else.' },
          ],
        },
        {
          title: 'The companion plugin',
          intro: 'A Paper plugin that makes the survival server part of the same network as the hub.',
          items: [
            {
              title: 'Hand-off on shutdown',
              text: 'Paper disables plugins before it kicks players, so when the SMP stops the plugin transfers everyone to the hub instead of dropping them on a disconnect screen. The reason travels in a client cookie, and the hub shows an "SMP restarting" countdown that reconnects them once the SMP answers a ping again.',
            },
            {
              title: 'Its own staff tools',
              text: 'A panel of player heads with punishments, teleports and gags, a mute list (Paper has bans but no mutes), /unban by name for players who are not online, announcements, and scheduled maintenance.',
            },
            {
              title: 'Safe on a survival world',
              text: 'The fake-lava gag is packets only, the falling anvil is tagged so it cannot place a block, firework shows are tagged so explosions cannot hurt a bystander, and every click in a staff menu is cancelled so filler panes cannot be carried out as free glass.',
            },
            {
              title: 'Two servers, no proxy',
              text: 'Players cross with client transfer packets and the client follows SRV records, so the real port lives only in DNS. Maintenance is scheduled once and warns both servers, with the schedule carried in the hub\'s server-list ping.',
            },
          ],
        },
        {
          title: 'Where it stands',
          items: [
            { title: 'Deployed', text: 'The plugin compiles against the Paper API and is deployed. Its newer features have not been exercised on a live Paper server as thoroughly as the hub\'s have.' },
          ],
        },
      ],
      images: [],
    },
    {
      id: 'cminigames',
      name: 'CMinigames',
      tagline: 'A minigame hub written from scratch on Minestom.',
      description: [
        'Not a plugin on top of an existing server. Minestom is a server library that implements the Minecraft protocol and nothing else: no world, no inventory behaviour, no combat, no bows, no mobs, no commands. Everything a player can do here was written for this project.',
        'The hub is a round quartz plaza over the void with a mannequin per game. The plaza, the colonnade, the pools and every arena are generated in code.',
      ].join('\n\n'),
      address: 'play.itscalan.org',
      stats: [
        { label: 'Hub code', value: '~17.3K lines' },
        { label: 'Hub classes', value: '65' },
        { label: 'Minigames', value: '10' },
        { label: 'Hand-built arenas', value: '11' },
        { label: 'Test programs', value: '15' },
      ],
      tags: ['Java 25', 'Minestom 26.3', 'Gradle', 'Custom gameplay', 'Home-hosted'],
      links: [],
      sections: [
        {
          title: 'The games',
          items: [
            { title: 'Ice Boat Race', text: 'Four hand-built courses of blue ice with danger zones, personal bests and a records board.' },
            { title: 'MegaSpleef', text: 'Six spleef variants played once each in a player-voted order: shovels, bow spleef, TNT Run, a self-rotting arena, meteors and a lawnmower mode.' },
            { title: 'Block Party', text: 'A colour is called, the floor drops, and a Bumper on a 5-second cooldown lets you shove someone off theirs.' },
            { title: 'Hot Potato', text: 'Pass the potato by hitting someone before the fuse blows, across four courts voted on each round.' },
            { title: 'Hunger Games', text: 'Chest loot, a grace period and a shrinking border.' },
            { title: 'Sumo', text: 'A shrinking disc over the void and a knockback stick.' },
            { title: 'One in the Chamber', text: 'One arrow that kills outright. A kill refunds it.' },
            { title: 'King of the Hill', text: 'Hold a moving circle. A contested hill pays nobody.' },
            { title: 'Rising Lava', text: 'Climb ahead of a rising flood across four shafts, with a finish platform at the top.' },
            { title: 'Skywars', text: 'An island each over the void, with bridging and chest loot.' },
          ],
        },
        {
          title: 'Engineering highlights',
          items: [
            {
              title: 'Gameplay the engine does not have',
              text: 'Bows, armour, shields, food and fireworks, implemented from vanilla\'s own data definitions rather than copied numbers. Arrows launch along the look direction after the stock projectile helper sent shots about 11 degrees above the crosshair.',
            },
            {
              title: 'Server authority under lag',
              text: 'Minestom validates almost nothing, and after a player reported hits landing through walls the hub gained six deliberately generous checks: line of sight, dig reach, server-driven shoves, hover detection, movement judged as speed over elapsed time, and record floors. A false positive costs somebody a match, so they err on the side of the player.',
            },
            {
              title: 'Fault-isolated tick loop',
              text: 'Minestom cancels a scheduled task permanently if it throws, which once took down every game at the same time. Each game\'s tick is now wrapped so one exception never reaches the scheduler, and errors are logged at most once every ten seconds.',
            },
            {
              title: 'Per-game worlds',
              text: 'Each minigame owns an instance built once at boot and reset between rounds. Terrain generators are pure functions of position, so ten arenas and a four-course ice racing world load in under half a minute.',
            },
            {
              title: 'Shipping unfinished work safely',
              text: 'New games go in complete but invisible: shown to staff only, absent from the menu, and refused if joined any other way. /release opens one to everyone, and nothing is persisted, so a restart hides everything again. The in-game patch notes book leaves out lines about games a reader cannot see.',
            },
            {
              title: 'Testing without a client',
              text: 'Minestom boots in-process, so 15 test programs drive fake players through the real arenas tick by tick and read actual state. They found a Rising Lava shaft that could not be climbed, a Hot Potato game that started with "-1 potatoes", and eliminated players showing as floating items, all before players saw them.',
            },
          ],
        },
        {
          title: 'Operations',
          items: [
            { title: 'Hosted from home', text: 'An frp reverse tunnel to a small VPS exposes the server on 25565 with no port forwarding, and a Windows scheduled task starts the tunnel and restarts it if it dies.' },
            { title: 'Moderation', text: 'Ranks by name and permission level, with bans and mutes persisted with expiry and pruned as they lapse. Bans are enforced at the configuration stage, before a player ever reaches the lobby.' },
            { title: 'Records', text: 'Persisted per course and per player, and a corrupt file loses only its bad lines rather than taking the server down.' },
            { title: 'Stats integration', text: 'The hub polls a Rainbow Six stats API on a schedule and, when the tracked account ranks up, greets each player once with a firework announcement. Credentials stay out of the repository.' },
          ],
        },
        {
          title: 'Where it stands',
          items: [
            { title: 'Live and played', text: 'Six games are public. Four are complete but still behind the release gate.' },
            { title: 'Next steps', text: 'The verification programs run by hand rather than as part of the build, and moving them into a proper test source set is the obvious next step. Minestom 26.3 is built from a branch rather than a release, so the hub tracks a moving target.' },
          ],
        },
      ],
      images: [],
    },
  ],
};
