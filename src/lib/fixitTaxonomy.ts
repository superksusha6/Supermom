import { HomeIssueUrgency } from '@/types/app';

// Guided "Fix it" classifier: Area -> Item -> Symptom.
// Each symptom optionally carries a short self-help tip, the service category to
// route the call to, and a default urgency. Categories match FIXIT_CATEGORIES keys.

export type FixitSymptom = {
  key: string;
  label: string;
  tip?: string[];
  urgency?: HomeIssueUrgency;
};

export type FixitItem = {
  key: string;
  label: string;
  symptoms: FixitSymptom[];
};

export type FixitArea = {
  key: string;
  label: string;
  emoji: string;
  // Service category to route to (matches FIXIT_CATEGORIES); defaults to key.
  serviceCategory: string;
  items: FixitItem[];
};

export const FIXIT_CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: 'plumbing', label: 'Plumbing', emoji: '🚿' },
  { key: 'electrical', label: 'Electrical', emoji: '⚡' },
  { key: 'appliance', label: 'Appliance', emoji: '🔌' },
  { key: 'electronics', label: 'Electronics / TV', emoji: '📺' },
  { key: 'internet', label: 'Internet', emoji: '📶' },
  { key: 'heating', label: 'Heating / AC', emoji: '🌡️' },
  { key: 'furniture', label: 'Furniture', emoji: '🪛' },
  { key: 'doors', label: 'Doors / locks', emoji: '🔑' },
  { key: 'handyman', label: 'Handyman', emoji: '🔧' },
  { key: 'cleaning', label: 'Cleaning', emoji: '🧽' },
  { key: 'other', label: 'Other', emoji: '🏠' },
];

export function categoryMeta(key: string) {
  return FIXIT_CATEGORIES.find((c) => c.key === key) || FIXIT_CATEGORIES[FIXIT_CATEGORIES.length - 1];
}

export const FIXIT_TREE: FixitArea[] = [
  {
    key: 'plumbing',
    label: 'Plumbing',
    emoji: '🚿',
    serviceCategory: 'plumbing',
    items: [
      {
        key: 'tap',
        label: 'Tap / faucet',
        symptoms: [
          { key: 'leaking', label: 'Leaking', urgency: 'urgent', tip: ['Close the valve under the sink.', 'Put a bowl under the drip and don’t use it.'] },
          { key: 'no-water', label: 'No water', urgency: 'normal', tip: ['Check if other taps work — it may be a building-wide issue.'] },
          { key: 'dripping', label: 'Constant dripping', urgency: 'low', tip: ['Tighten the handle gently; if it keeps dripping, a washer likely needs replacing.'] },
          { key: 'low-pressure', label: 'Low pressure', urgency: 'low' },
        ],
      },
      {
        key: 'toilet',
        label: 'Toilet',
        symptoms: [
          { key: 'clogged', label: 'Clogged', urgency: 'normal', tip: ['Try a plunger before calling.'] },
          { key: 'leaking', label: 'Leaking / running', urgency: 'normal', tip: ['Turn the valve behind the toilet to stop water.'] },
          { key: 'wont-flush', label: 'Won’t flush', urgency: 'normal' },
        ],
      },
      {
        key: 'pipe',
        label: 'Pipe / drain',
        symptoms: [
          { key: 'burst', label: 'Burst / flooding', urgency: 'urgent', tip: ['Turn off the main water valve immediately, then call a plumber.'] },
          { key: 'blocked', label: 'Blocked drain', urgency: 'normal' },
          { key: 'smell', label: 'Bad smell', urgency: 'low' },
        ],
      },
      {
        key: 'water-heater',
        label: 'Water heater / boiler',
        symptoms: [
          { key: 'no-hot-water', label: 'No hot water', urgency: 'normal' },
          { key: 'leaking', label: 'Leaking', urgency: 'urgent', tip: ['Switch it off and shut the water supply to it.'] },
        ],
      },
    ],
  },
  {
    key: 'electrical',
    label: 'Electrical',
    emoji: '⚡',
    serviceCategory: 'electrical',
    items: [
      {
        key: 'power',
        label: 'Power / breaker',
        symptoms: [
          { key: 'no-power-room', label: 'No power in a room', urgency: 'normal', tip: ['Check the breaker panel — flip the tripped switch back on.'] },
          { key: 'no-power-home', label: 'No power at all', urgency: 'urgent', tip: ['Check if neighbours have power — it may be an outage.'] },
          { key: 'keeps-tripping', label: 'Breaker keeps tripping', urgency: 'normal', tip: ['Unplug recent appliances; if it still trips, call an electrician.'] },
        ],
      },
      {
        key: 'socket',
        label: 'Socket / outlet',
        symptoms: [
          { key: 'not-working', label: 'Not working', urgency: 'normal' },
          { key: 'sparks', label: 'Sparks / burning smell', urgency: 'urgent', tip: ['Stop using it now and switch off that circuit. Call an electrician.'] },
          { key: 'loose', label: 'Loose / damaged', urgency: 'normal' },
        ],
      },
      {
        key: 'light',
        label: 'Light / switch',
        symptoms: [
          { key: 'not-working', label: 'Not working', urgency: 'low', tip: ['Try replacing the bulb first.'] },
          { key: 'flickering', label: 'Flickering', urgency: 'low' },
          { key: 'switch-broken', label: 'Switch broken', urgency: 'normal' },
        ],
      },
    ],
  },
  {
    key: 'appliance',
    label: 'Appliance',
    emoji: '🔌',
    serviceCategory: 'appliance',
    items: [
      {
        key: 'fridge',
        label: 'Fridge / freezer',
        symptoms: [
          { key: 'not-cooling', label: 'Not cooling', urgency: 'urgent', tip: ['Check it’s plugged in and the temperature dial isn’t off.'] },
          { key: 'leaking', label: 'Leaking water', urgency: 'normal' },
          { key: 'noisy', label: 'Noisy', urgency: 'low' },
          { key: 'wont-start', label: 'Won’t turn on', urgency: 'normal' },
        ],
      },
      {
        key: 'washer',
        label: 'Washing machine',
        symptoms: [
          { key: 'wont-start', label: 'Won’t start', urgency: 'normal', tip: ['Check the door is fully closed and it has power.'] },
          { key: 'leaking', label: 'Leaking', urgency: 'urgent', tip: ['Turn off its water tap and don’t run it.'] },
          { key: 'wont-drain', label: 'Won’t drain / spin', urgency: 'normal' },
        ],
      },
      {
        key: 'dishwasher',
        label: 'Dishwasher',
        symptoms: [
          { key: 'wont-start', label: 'Won’t start', urgency: 'low' },
          { key: 'leaking', label: 'Leaking', urgency: 'normal' },
          { key: 'not-cleaning', label: 'Not cleaning well', urgency: 'low' },
        ],
      },
      {
        key: 'oven',
        label: 'Oven / stove',
        symptoms: [
          { key: 'not-heating', label: 'Not heating', urgency: 'normal' },
          { key: 'wont-start', label: 'Won’t turn on', urgency: 'normal' },
          { key: 'gas-smell', label: 'Gas smell', urgency: 'urgent', tip: ['Turn off the gas, open windows, don’t use switches, and call the gas service.'] },
        ],
      },
    ],
  },
  {
    key: 'electronics',
    label: 'Electronics / TV',
    emoji: '📺',
    serviceCategory: 'electronics',
    items: [
      {
        key: 'tv',
        label: 'TV',
        symptoms: [
          { key: 'wont-turn-on', label: 'Won’t turn on', urgency: 'low', tip: ['Check the power cable and try a different socket.'] },
          { key: 'no-picture', label: 'No picture', urgency: 'low', tip: ['Check the cable and the input/source (HDMI).'] },
          { key: 'no-sound', label: 'No sound', urgency: 'low', tip: ['Check volume/mute and the audio source.'] },
          { key: 'cracked', label: 'Cracked screen', urgency: 'normal' },
        ],
      },
      {
        key: 'computer',
        label: 'Computer / laptop',
        symptoms: [
          { key: 'wont-turn-on', label: 'Won’t turn on', urgency: 'normal' },
          { key: 'slow', label: 'Very slow', urgency: 'low' },
          { key: 'broken', label: 'Broken / damaged', urgency: 'normal' },
        ],
      },
      {
        key: 'other-device',
        label: 'Other device',
        symptoms: [
          { key: 'wont-turn-on', label: 'Won’t turn on', urgency: 'low' },
          { key: 'broken', label: 'Broken', urgency: 'low' },
        ],
      },
    ],
  },
  {
    key: 'internet',
    label: 'Internet / TV box',
    emoji: '📶',
    serviceCategory: 'internet',
    items: [
      {
        key: 'wifi',
        label: 'Wi-Fi / router',
        symptoms: [
          { key: 'no-internet', label: 'No internet', urgency: 'normal', tip: ['Restart the router: unplug for 30 seconds, plug back in.'] },
          { key: 'slow', label: 'Slow / dropping', urgency: 'low', tip: ['Restart the router and move closer to it.'] },
        ],
      },
      {
        key: 'tv-box',
        label: 'TV box',
        symptoms: [
          { key: 'no-signal', label: 'No signal', urgency: 'low', tip: ['Restart the box and check the cable.'] },
          { key: 'frozen', label: 'Frozen', urgency: 'low' },
        ],
      },
    ],
  },
  {
    key: 'heating',
    label: 'Heating / AC',
    emoji: '🌡️',
    serviceCategory: 'heating',
    items: [
      {
        key: 'heating',
        label: 'Heating / radiator',
        symptoms: [
          { key: 'no-heat', label: 'No heat', urgency: 'normal' },
          { key: 'leaking', label: 'Leaking', urgency: 'normal' },
          { key: 'noisy', label: 'Noisy', urgency: 'low' },
        ],
      },
      {
        key: 'ac',
        label: 'Air conditioner',
        symptoms: [
          { key: 'no-cooling', label: 'Not cooling', urgency: 'normal' },
          { key: 'leaking', label: 'Leaking water', urgency: 'normal' },
          { key: 'smell', label: 'Bad smell', urgency: 'low' },
        ],
      },
    ],
  },
  {
    key: 'furniture',
    label: 'Furniture',
    emoji: '🪛',
    serviceCategory: 'furniture',
    items: [
      {
        key: 'assemble',
        label: 'Assemble',
        symptoms: [
          { key: 'need-assembly', label: 'Needs assembling', urgency: 'low' },
        ],
      },
      {
        key: 'broken',
        label: 'Broken / loose',
        symptoms: [
          { key: 'broken', label: 'Broken', urgency: 'low' },
          { key: 'loose', label: 'Loose / wobbly', urgency: 'low' },
        ],
      },
      {
        key: 'mount',
        label: 'Mount / hang',
        symptoms: [
          { key: 'hang', label: 'Hang shelf / picture', urgency: 'low' },
          { key: 'mount-tv', label: 'Mount TV', urgency: 'low' },
        ],
      },
    ],
  },
  {
    key: 'doors',
    label: 'Doors / locks',
    emoji: '🔑',
    serviceCategory: 'doors',
    items: [
      {
        key: 'lock',
        label: 'Lock',
        symptoms: [
          { key: 'wont-lock', label: 'Won’t lock', urgency: 'normal' },
          { key: 'stuck', label: 'Stuck / jammed', urgency: 'urgent', tip: ['If you’re locked out, call a locksmith.'] },
          { key: 'lost-key', label: 'Lost key', urgency: 'urgent' },
        ],
      },
      {
        key: 'door',
        label: 'Door',
        symptoms: [
          { key: 'wont-close', label: 'Won’t close', urgency: 'normal' },
          { key: 'broken', label: 'Broken / damaged', urgency: 'normal' },
        ],
      },
      {
        key: 'window',
        label: 'Window',
        symptoms: [
          { key: 'wont-close', label: 'Won’t close', urgency: 'normal' },
          { key: 'broken', label: 'Broken / cracked', urgency: 'normal' },
        ],
      },
    ],
  },
];
