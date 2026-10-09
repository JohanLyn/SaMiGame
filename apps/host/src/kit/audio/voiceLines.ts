/**
 * Speakerens replikker (glad, energisk engelsk vært – børnevenlig). Hver nøgle har én eller flere varianter; der vælges tilfældigt.
 * Lydfilerne ligger i `voice/<nøgle>-<n>.mp3` og laves med `scripts/voice/build-voice.ts` (se docs/DEV_GUIDE.md).
 *
 * Stil:
 * - `hype`: store øjeblikke – mest energi og lidt mere rumklang; spilles med whoosh + glitter-klokker.
 * - `call`: almindelige speaker-kald.
 * - `aside`: små kommentarer – tørrere og lidt lavere i lydstyrke.
 */
export type VoiceStyle = 'hype' | 'call' | 'aside';

export interface VoiceLine {
  style: VoiceStyle;
  lines: readonly string[];
}

const hype = (...lines: string[]): VoiceLine => ({ style: 'hype', lines });
const call = (...lines: string[]): VoiceLine => ({ style: 'call', lines });
const aside = (...lines: string[]): VoiceLine => ({ style: 'aside', lines });

export const VOICE = {
  // --- Fælles flow -----------------------------------------------------------
  welcome: hype('Hello, everybody! Welcome to SaMi Party!', 'Woohoo! Party on the island!', 'Come on in, everybody! It is party time!'),
  start: hype('Yay! Let the fun begin!', 'Here we go, here we go!', 'Are you ready? I am super ready!'),
  // Runde-skærmen (`round_<n>`, sidste runde før finalen får `finalRound`)
  round_1: hype('Round one!'),
  round_2: hype('Round two!'),
  round_3: hype('Round three!'),
  round_4: hype('Round four!'),
  round_5: hype('Round five!'),
  round_6: hype('Round six!'),
  round_7: hype('Round seven!'),
  round_8: hype('Round eight!'),
  round_9: hype('Round nine!'),
  round_10: hype('Round ten!'),
  round_11: hype('Round eleven!'),
  round_12: hype('Round twelve!'),
  round_13: hype('Round thirteen!'),
  round_14: hype('Round fourteen!'),
  round_15: hype('Round fifteen!'),
  finalRound: hype('Final round!'),
  ritual: call('Ooh, what is next?', 'I can not wait to see!', 'Drum roll, please!'),
  chaos: hype('Wow! A chaos card!', 'Uh oh! Things are about to get silly!', 'Whoa! Nobody saw that coming!'),
  twoVsTwo: hype('Two versus two! Team up!'),
  oneVsThree: hype('One versus three! Wow!'),
  go: hype('Go!', 'Let us play!', 'Go, go, go!'),
  finish: hype('Finish!', 'Time is up!', 'And... stop!'),
  win: hype('Woohoo! We have a winner!', 'Amazing!', 'Wow, what a superstar!', 'Fantastic!'),
  draw: call('Ooh, it is a draw!'),
  ouch: aside('Oopsie!', 'Whoopsie daisy!', 'Uh oh!'),
  lead: call('Ooh, we have a new leader!', 'Look who is on top now!'),
  oneOut: aside('Oh no, one is out!'),
  oneLeft: hype('Only one left! Wow!'),
  doubleWin: hype('Double win!'),
  tripleWin: hype('Triple win!'),
  unstoppable: hype('Unstoppable! Wow!'),
  superstar: hype('Superstar!'),
  finale: hype('It is the grand finale! The Chaos Tower!', 'This is it! The big finale!'),
  awards: hype('Yay! It is award time!', 'And the winner is...'),
  awardWinner: hype('Congratulations!', 'Let us give them a big cheer!', 'Hooray!'),
  standings: call('And now... the final standings!'),
  champion: hype('Hooray! We have a champion! Give it up for the winner of SaMi Party!'),

  // --- "Næste spil" pr. minigame ----------------------------------------------
  next_badekar: hype('Next game is... Bathtub Bobsled!'),
  next_bowling: hype('Next game is... Meatball Bowling!'),
  next_fisketur: hype("Next game... The Cat's Fishing Trip!"),
  next_kagebombe: hype('Next game is... Cake Bomb!'),
  next_kanon: hype('Next game is... Cannon Chicken!'),
  next_kaostaarn: hype('And the final game is... The Chaos Tower!'),
  next_kogebog: hype('Next game is... Pop-up Cookbook!'),
  next_kokken: hype('Next game is... Chef Says!'),
  next_prutte: hype('Next game is... Fart Roulette!'),
  next_selfie: hype('Next game is... Selfie Surgeon!'),
  next_sjippe: hype('Next game is... Skipping Eel!'),
  next_skrig: hype('Next game is... Scream Balloon!'),
  next_spaghetti: hype('Next game is... Spaghetti Tug of War!'),
  next_spejldans: hype('Next game is... Mirror Dance!'),
  next_sumo: hype('Next game is... Meatball Sumo!'),
  next_svampe: hype('Next game is... Mushroom Roulette!'),
  next_toiletter: hype('Next game is... Toilet Hide and Seek!'),

  // --- Ritualer ---------------------------------------------------------------
  fishBiteMaybe: call('A bite! ...or is it?'),
  fishBoot: aside('A boot! Smells like chaos!'),
  volcanoHold: call('It cannot hold it in!'),
  volcanoSneeze: hype('Watch out! It is gonna sneeze!'),
  clawGo: call('Come on, you can do it!'),
  clawStuck: aside('It is stuck!'),

  // --- Minigames ----------------------------------------------------------------
  sumoStart: call('Push them out of the pan!'),

  cannonLoaded: call('The cannon chicken is loaded!'),
  cannonTrio: hype('The trio survived the egg storm!'),
  megaEgg: hype('Mega egg!'),

  eelStart: call('Jump over the eel!'),
  sprint: hype('Sprint!'),
  hiccup: aside('Hic!'),
  eelHit: aside('Splish! Into the swamp!'),
  doubleSplat: hype('Double splat!'),
  eelChamp: hype('Skipping champion!'),

  bobsledStart: call('Down the hill! Watch the turns!'),
  bobsledWall: aside('Bump! Into the snow wall!', 'Whoa, this track really bends!'),
  bobsledDuck: aside('Poor little rubber duck!'),
  bobsledIce: aside('Clonk! Straight into the ice!'),
  bobsledFinish: hype('The bathtub has crossed the line!'),

  strikeTime: call('Strike time!'),
  bowlFast: aside('That thing is flying!'),
  gutter: aside('Gutter ball!'),
  allThreeDown: hype('All three are down!'),
  soloStrike: hype('The solo player knocked them all down!'),
  pinsHold: hype('The pins stood their ground!'),

  hide: call('Hide in the toilets!'),
  seekerWins: hype('The seeker found them all!'),
  trioSneaky: hype('The trio was too sneaky!'),
  trioPick: call('Trio! Pick a toilet in secret!'),
  findThem: call('Find them!'),
  foundMany: hype('Bingo! A whole bunch at once!'),
  foundOne: call('Boo! Got you!'),
  quack: aside('Quack! It was just a duck!'),
  stink: aside('Phew, what a stink!'),
  toiletPaper: aside('Just toilet paper!'),

  chefStart: call('The chef says: press the right one!'),
  faster: hype('Faster! Faster!'),
  again: aside('Everyone? Let us do that again!'),
  sausage: aside('Ha! It was a sausage!'),
  splatOut: aside('Splat! Oh no, you are out!'),
  chefImpressed: hype('The chef is impressed!'),

  catHungry: call('The cat is hungry! Swim, little fishies, swim!'),
  fishEscaped: hype('The fish got away!'),
  bucketFull: hype('The bucket is full!'),
  oneFishLeft: call('Only one fish left!'),
  fishOnHook: aside('Fish on the hook!'),

  fartStart: call('One of these pumps is a fart bomb! Good luck!'),
  fewerPumps: call('Fewer pumps now!'),
  lastRound: hype('Final round!'),
  phew: aside('Phew!', 'It held!', 'My heart is in my throat!'),
  megaFart: hype('Mega fart! Hee hee! Bye bye!'),

  screamStart: hype('Scream! Blow up the balloon, but not too much!'),
  screamLouder: call('Ten seconds! Scream louder!'),
  bang: hype('Bang! It popped!'),
  measure: call('Stop! Let us measure the balloons!'),
  biggestBalloon: hype('Applause for the biggest balloon!'),
  allPopped: hype('Every balloon popped! Total chaos!'),

  cookbookStart: call('Stand in the holes, or you will be pancakes!'),
  smallerHoles: call('The holes are getting smaller!'),
  doublePancake: hype('Double pancake!'),

  danceStart: call('Dance! And keep the beat with your partner!'),
  danceCouple: hype('What a dance couple!'),
  danceSync: aside('Perfect mirror image!', 'They dance as one!'),

  towerWelcome: hype('Welcome to the finale! The Chaos Tower! First to the top wins the trophy!'),
  climb: call('Climb! Climb! Climb!'),
  towerTenSec: hype('Ten seconds left! Climb, climb, climb!'),
  towerTop: hype('We have someone at the top! The trophy is home!'),
  towerAlsoUp: call('Another one made it!'),
  rooftops: aside('Over the rooftops! Wave to mom!'),
  halfway: call('Halfway! The air is getting thin!'),
  space: aside('We are in space! Is that a satellite?'),
  finalStretch: hype('Final stretch! The trophy is right there!'),
  guestMeatballs: call('Watch out! The meatballs are rolling!'),
  guestEel: call('The eel is back! And it is swinging!'),
  guestCushions: call('Fart cushions! Jump on them!'),
  guestChicken: call('The cannon chicken brought eggs!'),
  guestMustard: aside('The chef says: mustard in your face!'),

  spaghettiStart: call('Pull the spaghetti, and keep the beat!'),
  slippery: aside('The sauce makes it slippery!'),
  bellissimo: hype('Bellissimo! Perfect timing!', 'Mamma mia, what a team!'),
  hotSauce: aside('Whoa! The sauce is hot!'),
  spaghettiDraw: call('A draw! The spaghetti did not even snap.'),
  sauceSplash: hype('Splash! Right into the sauce!'),

  cakeStart: call('Cut the right wire, or it is whipped cream time!'),
  threeCakes: hype('Three cakes saved! What a team!'),
  cakeSaved: aside('Phew! The cake is saved!', 'Nice cut!'),
  cakeBoom: hype('Splat! Whipped cream in the face!', 'Boom! That cake was not ready.'),

  selfieStart: call('Copy the portrait! Pull those faces!'),
  grumpier: call('Halfway! Grumpier! Grumpier!'),
  scalpels: call('Ten seconds! The scalpels are glowing!'),
  scalpelsDown: call('Scalpels down! Let us see the likeness!'),
  twin: hype('It is a twin!'),
  meh: aside('Hmm... not bad!'),

  mushroomStart: call('Stand on the right mushroom!'),
  red: hype('Red!'),
  blue: hype('Blue!'),
  green: hype('Green!'),
  purple: hype('Purple!'),
  orange: hype('Orange!'),
  mushroomKing: hype('The mushroom king has been found!'),
  soup: aside('Splash! Into the soup!'),
  soupTwice: aside('Splash! And splash!'),
} as const satisfies Record<string, VoiceLine>;

export type VoiceKey = keyof typeof VOICE;
