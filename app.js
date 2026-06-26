const STORAGE_KEY = "oistop.mvp.state.v2";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WEEKEND = ["Sat", "Sun"];
const ALL_DAYS = [...WEEKDAYS, ...WEEKEND];

const locationTypes = {
  Home: { icon: "🏠", address: "Current location pinned" },
  Work: { icon: "💼", address: "14 Pitch Deck Lane, London" },
  Gym: { icon: "🏋️", address: "The Daily Sweat, London" },
  Airport: { icon: "✈️", address: "Heathrow Airport" },
  "Custom Location": { icon: "📍", address: "" }
};

const presets = {
  Home: [["🔑", "Keys"], ["👛", "Wallet"], ["📱", "Phone"], ["🪪", "Work ID"], ["👓", "Glasses"], ["💊", "Medication"], ["🔌", "Charger"]],
  Work: [["💻", "Laptop"], ["🔌", "Charger"], ["🪪", "ID Card"], ["🎧", "Headphones"]],
  Gym: [["👟", "Trainers"], ["🧴", "Towel"], ["🥤", "Bottle"], ["🎧", "Earbuds"]],
  Airport: [["🛂", "Passport"], ["👛", "Wallet"], ["📱", "Phone"], ["🔌", "Charger"], ["🎫", "Boarding Pass"], ["💊", "Medication"], ["📄", "Travel documents"]]
};

const navItems = [
  ["dashboard", "⌂", "Home"],
  ["checklist", "✓", "List"],
  ["profiles", "◷", "Profiles"],
  ["travel", "✈", "Travel"],
  ["history", "↺", "History"],
  ["settings", "⚙", "Settings"]
];

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const $ = (selector) => document.querySelector(selector);
let snoozeTimer = null;
let toastTimer = null;

function makeChecklist(type) {
  return (presets[type] || presets.Home).map(([emoji, label]) => ({ id: uid("item"), emoji, label, enabled: true }));
}

function initialState() {
  return {
    screen: "welcome",
    selectedLocationId: "home",
    travelModeActive: false,
    toast: null,
    activeReminder: null,
    snoozedReminder: null,
    draftLocation: { type: "Home", name: "Home", address: "Current location pinned", radius: 200 },
    settings: {
      notifications: true,
      sound: true,
      quietHours: true,
      quietStart: "22:00",
      quietEnd: "07:00",
      defaultRadius: 200,
      tone: "Cheeky"
    },
    locations: [
      {
        id: "home",
        type: "Home",
        icon: "🏠",
        name: "Home",
        address: "Current location pinned",
        radius: 200,
        active: true,
        lastReminder: "Today 08:12",
        profile: { mode: "Everyday", days: ALL_DAYS, start: "06:30", end: "10:30" },
        checklist: makeChecklist("Home")
      },
      {
        id: "work",
        type: "Work",
        icon: "💼",
        name: "Work",
        address: "14 Pitch Deck Lane, London",
        radius: 200,
        active: true,
        lastReminder: "Yesterday 17:45",
        profile: { mode: "Weekdays only", days: WEEKDAYS, start: "07:00", end: "10:00" },
        checklist: makeChecklist("Work")
      },
      {
        id: "gym",
        type: "Gym",
        icon: "🏋️",
        name: "Gym",
        address: "The Daily Sweat, London",
        radius: 100,
        active: true,
        lastReminder: "Friday 19:10",
        profile: { mode: "Custom days", days: ["Mon", "Wed", "Fri"], start: "17:00", end: "21:00" },
        checklist: makeChecklist("Gym")
      },
      {
        id: "airport",
        type: "Airport",
        icon: "✈️",
        name: "Airport",
        address: "Heathrow Airport",
        radius: 500,
        active: false,
        lastReminder: "Not yet",
        profile: { mode: "Custom days", days: ALL_DAYS, start: "04:00", end: "23:00" },
        checklist: makeChecklist("Airport")
      }
    ],
    history: [
      { id: uid("history"), locationId: "home", locationName: "Home", timestamp: "Today at 08:12", action: "User confirmed ready", detail: "Keys, Wallet, Phone, Work ID checked.", tone: "good" },
      { id: uid("history"), locationId: "work", locationName: "Work", timestamp: "Yesterday at 17:45", action: "User selected Let Me Check", detail: "Reminder left unresolved.", tone: "warn" }
    ]
  };
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialState();
    return {
      ...initialState(),
      ...JSON.parse(stored),
      screen: "welcome",
      activeReminder: null,
      snoozedReminder: null,
      toast: null
    };
  } catch {
    return initialState();
  }
}

let state = loadState();

function saveState() {
  const { toast, ...persisted } = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

function setState(next) {
  state = { ...state, ...next };
  saveState();
  render();
  scheduleSnooze();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  state = { ...state, toast: message };
  render();
  toastTimer = window.setTimeout(() => {
    state = { ...state, toast: null };
    render();
  }, 2500);
}

function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  let valueProp;
  Object.entries(props || {}).forEach(([key, value]) => {
    if (value === false || value === null || value === undefined) return;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else if (key === "value") valueProp = value;
    else if (key === "disabled") node.disabled = Boolean(value);
    else if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value);
  });
  children.flat().forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.append(child.nodeType ? child : document.createTextNode(child));
  });
  if (valueProp !== undefined) node.value = valueProp;
  return node;
}

function commandButton(label, icon, onClick, className = "primary-btn", options = {}) {
  return h("button", { class: className, onClick, disabled: options.disabled }, h("span", { "aria-hidden": "true", text: icon }), h("span", { text: label }));
}

function iconButton(label, icon, onClick, options = {}) {
  return h("button", { class: options.class || "icon-btn", title: label, "aria-label": label, onClick, disabled: options.disabled }, icon);
}

function getLocation(id = state.selectedLocationId) {
  return state.locations.find((location) => location.id === id) || state.locations[0];
}

function activeItems(location) {
  return location.checklist.filter((item) => item.enabled && item.label.trim());
}

function updateLocation(id, patchOrFn) {
  const locations = state.locations.map((location) => {
    if (location.id !== id) return location;
    return typeof patchOrFn === "function" ? patchOrFn(location) : { ...location, ...patchOrFn };
  });
  setState({ locations });
}

function toneLine(standard) {
  return standard;
}

function phoneStatusBar() {
  return h(
    "div",
    { class: "phone-status", "aria-hidden": "true" },
    h("span", { class: "phone-time", text: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }),
    h(
      "div",
      { class: "phone-indicators" },
      h("span", { class: "signal-pill", text: "5G" }),
      h("span", { class: "signal-bars" }, h("i", {}), h("i", {}), h("i", {})),
      h("span", { class: "battery" })
    )
  );
}

function appHeader() {
  return h(
    "header",
    { class: "app-header" },
    h("div", { class: "brand-lockup" }, h("div", { class: "logo-mark small", text: "Oi!" }), h("div", {}, h("p", { class: "brand-title", text: "OiStop!" }), h("span", { class: "brand-subtitle", text: toneLine("Stops you before you forget.") }))),
    commandButton("Test", "!", () => DepartureEngine.trigger(state.selectedLocationId), "ghost-btn")
  );
}

function bottomNav() {
  return h("nav", { class: "bottom-nav", "aria-label": "Main navigation" }, h("div", { class: "nav-inner" }, navItems.map(([screen, icon, label]) => h("button", { class: `nav-btn ${state.screen === screen ? "active" : ""}`, onClick: () => setState({ screen }), "aria-label": label }, h("span", { class: "nav-icon", text: icon }), h("span", { text: label })))));
}

function shell(content, hideChrome = false) {
  return h(
    "div",
    { class: `phone-frame ${hideChrome ? "welcome-frame" : ""}` },
    h("div", { class: "phone-speaker", "aria-hidden": "true" }),
    h(
      "div",
      { class: "phone-screen" },
      phoneStatusBar(),
      hideChrome ? null : appHeader(),
      content,
      hideChrome ? h("div", { class: "phone-home-indicator", "aria-hidden": "true" }) : bottomNav(),
      state.activeReminder ? ReminderOverlay() : null,
      state.toast ? h("div", { class: "toast", text: state.toast }) : null
    )
  );
}

function WelcomeScreen() {
  return shell(
    h(
      "main",
      { class: "hero-screen" },
      h("section", { class: "hero-copy" }, h("span", { class: "eyebrow", text: "Leaving already?" }), h("h1", { text: "OiStop!" }), h("p", { class: "lead", text: "Before you leave, OiStop! reminds you what matters." }), h("p", { class: "muted", text: "Create checklists for home, work, gym, travel and more. When you leave, OiStop! gives you a quick reminder." }), h("div", { class: "hero-actions" }, commandButton("Set Up My First Nudge", "→", () => beginOnboarding("Home")), commandButton("View Demo Dashboard", "⌂", () => setState({ screen: "dashboard" }), "ghost-btn"))),
      h("section", { class: "hero-art", "aria-label": "OiStop reminder preview" }, h("div", { class: "logo-mark", text: "Oi!" }))
    ),
    true
  );
}

function beginOnboarding(type) {
  const defaults = locationTypes[type];
  const existing = state.locations.find((location) => location.type === type);
  setState({
    screen: "onboarding",
    draftLocation: {
      type,
      name: existing?.name || (type === "Custom Location" ? "" : type),
      address: existing?.address || defaults.address,
      radius: existing?.radius || state.settings.defaultRadius
    }
  });
}

function OnboardingScreen() {
  const draft = state.draftLocation;
  return shell(
    h(
      "main",
      { class: "screen narrow" },
      sectionHead("Set up your first nudge", "Home, work, gym or somewhere custom."),
      h(
        "section",
        { class: "form-panel" },
        h("div", { class: "field" }, h("span", { text: "Location type" }), h("div", { class: "chip-row" }, ["Home", "Work", "Gym", "Custom Location"].map((type) => h("button", { class: `type-chip ${draft.type === type ? "active" : ""}`, onClick: () => beginOnboarding(type) }, h("span", { text: locationTypes[type].icon }), h("span", { text: type }))))),
        h("div", { class: "field-grid" }, labeledInput("Location name", draft.name, () => {}, { id: "location-name", placeholder: "Home" }), h("label", { class: "field" }, h("span", { text: "Address" }), h("input", { id: "location-address", class: "input", value: draft.address, placeholder: "Address or postcode" }), commandButton("Use current location", "⌖", () => { $("#location-address").value = "Current location pinned"; showToast("Current location pinned. Lovely."); }, "ghost-btn"))),
        h("div", { class: "field" }, h("span", { text: "Reminder radius" }), h("div", { class: "chip-row" }, [100, 200, 500].map((radius) => h("button", { class: `radius-chip ${draft.radius === radius ? "active" : ""}`, onClick: () => setState({ draftLocation: { ...state.draftLocation, radius } }) }, `${radius}m`)))),
        commandButton("Build My Checklist", "✓", saveDraftLocation)
      )
    )
  );
}

function labeledInput(label, value, onChange, attrs = {}) {
  return h("label", { class: "field" }, h("span", { text: label }), h("input", { class: "input", value, onChange: (event) => onChange(event.target.value), ...attrs }));
}

function saveDraftLocation() {
  const draft = {
    ...state.draftLocation,
    name: $("#location-name")?.value.trim() || state.draftLocation.name,
    address: $("#location-address")?.value.trim() || state.draftLocation.address || "Address to be added"
  };
  if (!draft.name.trim()) return showToast("Give this place a name first.");
  const presetType = draft.type === "Custom Location" ? "Home" : draft.type;
  const existingId = draft.type === "Custom Location" ? null : state.locations.find((location) => location.type === draft.type)?.id;
  const id = existingId || uid("location");
  const current = state.locations.find((location) => location.id === id);
  const location = {
    id,
    type: draft.type,
    icon: locationTypes[draft.type].icon,
    name: draft.name,
    address: draft.address,
    radius: draft.radius,
    active: true,
    lastReminder: current?.lastReminder || "Not yet",
    profile: current?.profile || { mode: "Everyday", days: ALL_DAYS, start: "07:00", end: "22:00" },
    checklist: current?.checklist || makeChecklist(presetType)
  };
  setState({
    selectedLocationId: id,
    screen: "checklist",
    locations: current ? state.locations.map((item) => (item.id === id ? location : item)) : [location, ...state.locations]
  });
}

function DashboardScreen() {
  return shell(
    h(
      "main",
      { class: "screen" },
      h("div", { class: "section-head" }, h("div", {}, h("h2", { text: "Leaving already?" }), h("p", { class: "muted", text: "Your saved departure nudges." })), commandButton("Add Location", "+", () => beginOnboarding("Custom Location"))),
      h("section", { class: "metric-row" }, statCard(state.locations.filter((l) => l.active).length, "Active places"), statCard(state.locations.reduce((sum, l) => sum + activeItems(l).length, 0), "Live essentials"), statCard(state.history.length, "Reminder logs")),
      h("section", { class: "travel-strip" }, h("span", { class: "eyebrow", text: "Demo note" }), h("h3", { text: "How does OiStop! work in the background?" }), h("p", { class: "muted", text: "This hosted MVP simulates geofence exits. The production app uses native iOS/Android geofencing to wake silently when you leave a saved place." }), h("div", { class: "button-row" }, commandButton("Show How It Works", "→", () => setState({ screen: "how" }), "ghost-btn"), commandButton("Trigger Demo Nudge", "!", () => DepartureEngine.trigger(state.selectedLocationId), "secondary-btn"))),
      h("section", { class: "section-head" }, h("div", {}, h("h3", { text: "Saved locations" })), h("div", { class: "button-row" }, commandButton("Add Checklist", "✓", () => setState({ screen: "checklist" }), "ghost-btn"), commandButton("Test Reminder", "!", () => DepartureEngine.trigger(state.selectedLocationId), "secondary-btn"))),
      h("section", { class: "card-grid" }, state.locations.map(LocationCard)),
      state.snoozedReminder ? h("section", { class: "travel-strip" }, h("span", { class: "badge warn", text: "Snoozed" }), h("h3", { text: `${getLocation(state.snoozedReminder.locationId).name} will nudge you again soon.` }), h("p", { class: "muted", text: `Scheduled for ${clock(state.snoozedReminder.dueAt)}.` })) : null
    )
  );
}

function sectionHead(title, subtitle) {
  return h("div", { class: "section-head" }, h("div", {}, h("h2", { text: title }), h("p", { class: "muted", text: subtitle })));
}

function statCard(value, label) {
  return h("div", { class: "stat-card" }, h("span", { class: "stat-value", text: String(value) }), h("span", { class: "stat-label", text: label }));
}

function LocationCard(location) {
  const items = activeItems(location);
  return h(
    "article",
    { class: "location-card" },
    h("div", { class: "card-title-row" }, h("div", { class: "place-title" }, h("span", { class: "place-icon", text: location.icon }), h("div", {}, h("h3", { text: location.name }), h("p", { class: "tiny muted", text: `${location.radius}m radius · ${profileSummary(location.profile)}` }))), h("span", { class: `status-pill ${location.active ? "" : "badge warn"}`, text: location.active ? "Active" : "Paused" })),
    h("div", { class: "check-preview" }, items.slice(0, 4).map((item) => h("span", { class: "check-chip", text: `${item.emoji} ${item.label}` })), items.length > 4 ? h("span", { class: "check-chip", text: `+${items.length - 4}` }) : null),
    h("p", { class: "tiny muted", text: `Last reminder: ${location.lastReminder}` }),
    h("div", { class: "card-actions" }, commandButton("Edit checklist", "✓", () => setState({ selectedLocationId: location.id, screen: "checklist" }), "ghost-btn"), commandButton("Trigger", "!", () => DepartureEngine.trigger(location.id), "secondary-btn"), iconButton(location.active ? "Pause" : "Activate", location.active ? "Ⅱ" : "▶", () => updateLocation(location.id, { active: !location.active })))
  );
}

function ChecklistScreen() {
  const location = getLocation();
  return shell(
    h(
      "main",
      { class: "screen" },
      h("div", { class: "section-head" }, h("div", {}, h("h2", { text: "Got your essentials?" }), h("p", { class: "muted", text: `${location.name} checklist` })), h("select", { class: "select", value: location.id, onChange: (event) => setState({ selectedLocationId: event.target.value }) }, state.locations.map((item) => h("option", { value: item.id, text: item.name })))),
      h("div", { class: "two-col" }, h("section", { class: "form-panel" }, h("div", { class: "checklist" }, location.checklist.map((item, index) => ChecklistItem(location, item, index))), h("div", { class: "divider" }), addItemForm(location), h("div", { class: "button-row" }, commandButton("Save Checklist", "✓", () => { setState({ screen: "dashboard" }); showToast("Checklist saved. Don't blame us if you ignore it."); }), commandButton("Test Reminder", "!", () => DepartureEngine.trigger(location.id), "ghost-btn"))), h("aside", { class: "travel-strip" }, h("span", { class: "eyebrow", text: "Smart personal departure checklist" }), h("h3", { text: `Leaving ${location.name}?` }), h("p", { class: "muted", text: "OiStop! will nudge you with only the active items in this list." }), h("div", { class: "check-preview" }, activeItems(location).map((item) => h("span", { class: "check-chip", text: `${item.emoji} ${item.label}` })))))
    )
  );
}

function ChecklistItem(location, item, index) {
  return h("div", { class: "checklist-row" }, h("button", { class: `toggle ${item.enabled ? "active" : ""}`, "aria-label": item.enabled ? "Turn item off" : "Turn item on", onClick: () => updateChecklistItem(location.id, item.id, { enabled: !item.enabled }) }), h("input", { class: "emoji-input", value: item.emoji, maxlength: "4", "aria-label": `${item.label} emoji`, onChange: (event) => updateChecklistItem(location.id, item.id, { emoji: event.target.value || "•" }) }), h("input", { class: "input item-label", value: item.label, "aria-label": "Checklist item", onChange: (event) => updateChecklistItem(location.id, item.id, { label: event.target.value }) }), h("div", { class: "mini-actions" }, iconButton("Move up", "↑", () => moveChecklistItem(location.id, index, -1), { class: "mini-btn", disabled: index === 0 }), iconButton("Move down", "↓", () => moveChecklistItem(location.id, index, 1), { class: "mini-btn", disabled: index === location.checklist.length - 1 }), iconButton("Delete", "×", () => deleteChecklistItem(location.id, item.id), { class: "mini-btn" })));
}

function updateChecklistItem(locationId, itemId, patch) {
  updateLocation(locationId, (location) => ({ ...location, checklist: location.checklist.map((item) => (item.id === itemId ? { ...item, ...patch } : item)) }));
}

function moveChecklistItem(locationId, index, direction) {
  const location = getLocation(locationId);
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= location.checklist.length) return;
  const checklist = [...location.checklist];
  const [item] = checklist.splice(index, 1);
  checklist.splice(nextIndex, 0, item);
  updateLocation(locationId, { checklist });
}

function deleteChecklistItem(locationId, itemId) {
  updateLocation(locationId, (location) => ({ ...location, checklist: location.checklist.filter((item) => item.id !== itemId) }));
}

function addItemForm(location) {
  return h("form", { class: "add-item-grid", onSubmit: (event) => { event.preventDefault(); const label = $("#new-item-label")?.value.trim(); const emoji = $("#new-item-emoji")?.value || "✨"; if (!label) return; updateLocation(location.id, (item) => ({ ...item, checklist: [...item.checklist, { id: uid("item"), emoji, label, enabled: true }] })); showToast(`${label} added.`); } }, h("input", { id: "new-item-emoji", class: "emoji-input", value: "✨", maxlength: "4", "aria-label": "New item emoji" }), h("input", { id: "new-item-label", class: "input", placeholder: "Add custom item", "aria-label": "New checklist item" }), commandButton("Add Item", "+", null, "secondary-btn"));
}

function ProfilesScreen() {
  const location = getLocation();
  const profile = location.profile;
  return shell(h("main", { class: "screen narrow" }, sectionHead("Smart profiles", "Keep nudges active only when they make sense."), h("section", { class: "profile-panel" }, h("label", { class: "field" }, h("span", { text: "Checklist" }), h("select", { class: "select", value: location.id, onChange: (event) => setState({ selectedLocationId: event.target.value }) }, state.locations.map((item) => h("option", { value: item.id, text: item.name })))), h("div", { class: "field" }, h("span", { text: "Schedule" }), h("div", { class: "chip-row" }, ["Everyday", "Weekdays only", "Weekends only", "Custom days"].map((mode) => h("button", { class: `type-chip ${profile.mode === mode ? "active" : ""}`, onClick: () => setProfileMode(location.id, mode) }, mode)))), h("div", { class: "field" }, h("span", { text: "Custom days" }), h("div", { class: "chip-row" }, ALL_DAYS.map((day) => h("button", { class: `day-chip ${profile.days.includes(day) ? "active" : ""}`, onClick: () => toggleProfileDay(location.id, day) }, day)))), h("div", { class: "time-grid" }, labeledInput("Starts", profile.start, (value) => updateProfile(location.id, { start: value }), { type: "time" }), labeledInput("Ends", profile.end, (value) => updateProfile(location.id, { end: value }), { type: "time" })), h("div", { class: "badge good", text: `${location.name} active ${profileSummary(profile)}` }))));
}

function setProfileMode(locationId, mode) {
  updateProfile(locationId, { mode, days: mode === "Weekdays only" ? WEEKDAYS : mode === "Weekends only" ? WEEKEND : ALL_DAYS });
}

function toggleProfileDay(locationId, day) {
  const profile = getLocation(locationId).profile;
  updateProfile(locationId, { mode: "Custom days", days: profile.days.includes(day) ? profile.days.filter((item) => item !== day) : [...profile.days, day] });
}

function updateProfile(locationId, patch) {
  updateLocation(locationId, (location) => ({ ...location, profile: { ...location.profile, ...patch } }));
}

function TravelScreen() {
  const travel = getLocation("airport");
  return shell(h("main", { class: "screen narrow" }, h("div", { class: "section-head" }, h("div", {}, h("h2", { text: "Travel mode" }), h("p", { class: "muted", text: "Passport panic prevention." })), h("span", { class: state.travelModeActive ? "badge good" : "badge warn", text: state.travelModeActive ? "Active" : "Off" })), h("section", { class: "travel-strip" }, h("span", { class: "eyebrow", text: "OiStop! airport brain" }), h("h3", { text: "Don't leave the boring important stuff behind." }), h("div", { class: "travel-items" }, travel.checklist.map((item) => h("div", { class: "travel-item" }, h("span", { text: `${item.emoji} ${item.label}` }), h("button", { class: `toggle ${item.enabled ? "active" : ""}`, "aria-label": item.enabled ? `Turn ${item.label} off` : `Turn ${item.label} on`, onClick: () => updateChecklistItem(travel.id, item.id, { enabled: !item.enabled }) })))), h("div", { class: "button-row" }, commandButton("Activate Travel Mode", "✈", () => { updateLocation("airport", { active: true, lastReminder: "Ready for next trip" }); setState({ travelModeActive: true, selectedLocationId: "airport" }); showToast("Travel Mode active. Passport panic reduced."); }), commandButton("Trigger Travel Nudge", "!", () => DepartureEngine.trigger("airport"), "secondary-btn")))));
}

function HistoryScreen() {
  return shell(h("main", { class: "screen narrow" }, sectionHead("Reminder history", "Every nudge, neatly logged."), state.history.length ? h("section", { class: "history-list" }, state.history.map((entry) => h("article", { class: "history-card" }, h("span", { class: `history-dot ${entry.tone || ""}` }), h("div", {}, h("h3", { text: `${entry.locationName} reminder triggered` }), h("p", { class: "muted", text: entry.timestamp }), h("p", { text: entry.action }), h("p", { class: "tiny muted", text: entry.detail }))))) : h("section", { class: "empty-state" }, h("h3", { text: "No nudges yet" }), h("p", { class: "muted", text: "Trigger a demo reminder and the timeline fills in." }))));
}

function SettingsScreen() {
  return shell(h("main", { class: "screen narrow" }, sectionHead("Settings", "Friendly, useful, not annoying."), h("section", { class: "app-grid" }, settingsToggle("Notifications", "Departure nudges and snoozes.", state.settings.notifications, (value) => updateSettings({ notifications: value })), settingsToggle("Sound", "A small ping, not a full drama.", state.settings.sound, (value) => updateSettings({ sound: value })), h("div", { class: "settings-row" }, h("div", {}, h("h3", { text: "Reminder radius" }), h("p", { class: "muted tiny", text: "Default for new saved locations." })), h("select", { class: "select", value: String(state.settings.defaultRadius), onChange: (event) => updateSettings({ defaultRadius: Number(event.target.value) }) }, [100, 200, 500].map((radius) => h("option", { value: radius, text: `${radius}m` })))), settingsToggle("Quiet hours", `${state.settings.quietStart}-${state.settings.quietEnd}`, state.settings.quietHours, (value) => updateSettings({ quietHours: value })), h("div", { class: "settings-row" }, h("div", {}, h("h3", { text: "Cheeky tone" }), h("p", { class: "muted tiny", text: state.settings.tone === "Standard" ? "Leaving Home? Check your essentials." : "OiStop! Got your essentials?" })), h("select", { class: "select", value: state.settings.tone, onChange: (event) => updateSettings({ tone: event.target.value }) }, ["Standard", "Cheeky"].map((tone) => h("option", { value: tone, text: tone })))), h("div", { class: "settings-row" }, h("div", {}, h("h3", { text: "Background detection" }), h("p", { class: "muted tiny", text: "See what is simulated now and native later." })), commandButton("How It Works", "→", () => setState({ screen: "how" }), "ghost-btn")), h("div", { class: "settings-row" }, h("div", {}, h("h3", { text: "Dark mode" }), h("p", { class: "muted tiny", text: "Later. This yellow/black look already has bite." })), h("span", { class: "badge", text: "Later" })))));
}

function HowItWorksScreen() {
  return shell(
    h(
      "main",
      { class: "screen narrow" },
      sectionHead("How background nudges work", "What this Vercel demo shows, and what the production app needs."),
      h(
        "section",
        { class: "form-panel" },
        h("span", { class: "eyebrow", text: "MVP demo" }),
        h("h3", { text: "Hosted web version" }),
        h("p", { class: "muted", text: "On Vercel, OiStop! is a responsive PWA demo. It stores locations and checklists in localStorage and uses the Test Reminder buttons to simulate a geofence exit." }),
        h("p", { class: "muted", text: "This is enough for early user testing, pitch demos, and validating the core journey: create a location, build a checklist, then see the departure reminder." }),
        h("div", { class: "button-row" }, commandButton("Trigger Demo Reminder", "!", () => DepartureEngine.trigger(state.selectedLocationId), "secondary-btn"), commandButton("Back to Dashboard", "⌂", () => setState({ screen: "dashboard" }), "ghost-btn"))
      ),
      h(
        "section",
        { class: "how-grid" },
        howStep("1", "Save a place", "The user saves Home, Work, Gym, Airport, or a custom location with a radius such as 100m, 200m, or 500m."),
        howStep("2", "Watch for exit", "In production, iOS Core Location or Android Geofencing watches that radius in the background with user permission."),
        howStep("3", "Wake quietly", "When the user exits the saved area, the OS wakes the app briefly. OiStop! checks schedules, quiet hours, and active checklist items."),
        howStep("4", "Notify fast", "The user gets a local notification: OiStop! Leaving Home? Got your essentials? Tapping opens the full reminder.")
      ),
      h(
        "section",
        { class: "form-panel" },
        h("span", { class: "eyebrow", text: "Important" }),
        h("h3", { text: "A pure PWA cannot reliably do silent geofencing" }),
        h("p", { class: "muted", text: "Browsers can request location and send web push notifications, but reliable background exit detection is an OS-level feature. The production path should keep this UI and add a native wrapper such as Capacitor or React Native." }),
        h("p", { class: "muted", text: "Also, PWA features need HTTPS or localhost. Opening the app as a file:// URL is fine for viewing, but service workers, install behaviour, and notifications are not representative." })
      )
    )
  );
}

function howStep(number, title, body) {
  return h("article", { class: "how-step" }, h("span", { class: "how-number", text: number }), h("div", {}, h("h3", { text: title }), h("p", { class: "muted", text: body })));
}

function settingsToggle(title, subtitle, checked, onChange) {
  return h("div", { class: "settings-row" }, h("div", {}, h("h3", { text: title }), h("p", { class: "muted tiny", text: subtitle })), h("button", { class: `toggle ${checked ? "active" : ""}`, "aria-label": `${title} ${checked ? "on" : "off"}`, onClick: () => onChange(!checked) }));
}

function updateSettings(patch) {
  setState({ settings: { ...state.settings, ...patch } });
}

const DepartureEngine = {
  trigger(locationId, source = "demo") {
    const location = getLocation(locationId);
    if (!location.active) return showToast(`${location.name} is paused.`);
    setState({ selectedLocationId: location.id, activeReminder: { id: uid("reminder"), locationId: location.id, source, triggeredAt: Date.now() }, snoozedReminder: source === "snooze" ? null : state.snoozedReminder });
  },
  resolve(outcome) {
    const reminder = state.activeReminder;
    const location = getLocation(reminder?.locationId);
    if (!reminder || !location) return;
    const action = outcome === "confirmed" ? "User confirmed ready" : outcome === "unresolved" ? "User selected Let Me Check" : "User selected Remind Me Again";
    const detail = outcome === "confirmed" ? `${activeItems(location).map((item) => item.label).join(", ")} checked.` : outcome === "unresolved" ? "Reminder left unresolved." : "Another reminder scheduled.";
    const entry = { id: uid("history"), locationId: location.id, locationName: location.name, timestamp: timestamp(Date.now()), action, detail, tone: outcome === "confirmed" ? "good" : outcome === "unresolved" ? "warn" : "bad" };
    const locations = state.locations.map((item) => (item.id === location.id ? { ...item, lastReminder: shortTime(Date.now()) } : item));
    if (outcome === "snoozed") {
      setState({ locations, history: [entry, ...state.history], activeReminder: null, snoozedReminder: { locationId: location.id, dueAt: Date.now() + 5 * 60 * 1000, demoAt: Date.now() + 7000 } });
      return showToast("Snoozed. We'll give you another nudge.");
    }
    setState({ locations, history: [entry, ...state.history], activeReminder: null, screen: outcome === "confirmed" ? "dashboard" : "history" });
    showToast(outcome === "confirmed" ? "Sorted. Off you go." : "Marked unresolved.");
  }
};

function ReminderOverlay() {
  const location = getLocation(state.activeReminder.locationId);
  return h("div", { class: "reminder-overlay", role: "dialog", "aria-modal": "true", "aria-label": `Leaving ${location.name}` }, h("section", { class: "reminder-modal" }, h("div", { class: "reminder-hero" }, h("div", { class: "logo-mark", text: "Oi!" }), h("h2", { text: "OiStop!" }), h("p", { class: "lead", text: `Leaving ${location.name}?` }), h("p", { class: "muted", text: "Have you got:" })), h("div", { class: "reminder-list" }, activeItems(location).slice(0, 8).map((item) => h("div", { class: "reminder-line" }, h("span", { text: item.emoji }), h("span", { text: item.label })))), h("div", { class: "stack" }, commandButton("Yes, I'm Good", "✓", () => DepartureEngine.resolve("confirmed")), commandButton("Let Me Check", "…", () => DepartureEngine.resolve("unresolved"), "secondary-btn"), commandButton("Remind Me Again in 5 Minutes", "↺", () => DepartureEngine.resolve("snoozed"), "ghost-btn"))));
}

function scheduleSnooze() {
  window.clearTimeout(snoozeTimer);
  const snoozed = state.snoozedReminder;
  if (!snoozed) return;
  const delay = snoozed.demoAt - Date.now();
  if (delay <= 0) {
    setState({ snoozedReminder: null });
    DepartureEngine.trigger(snoozed.locationId, "snooze");
    return;
  }
  snoozeTimer = window.setTimeout(() => {
    setState({ snoozedReminder: null });
    DepartureEngine.trigger(snoozed.locationId, "snooze");
  }, delay);
}

function profileSummary(profile) {
  if (profile.mode === "Weekdays only") return "Mon-Fri";
  if (profile.mode === "Weekends only") return "Weekends";
  if (profile.mode === "Custom days") return `${profile.days.join(", ")} ${to12(profile.start)}-${to12(profile.end)}`;
  return "Everyday";
}

function to12(time) {
  const [rawHour, minute] = time.split(":").map(Number);
  const suffix = rawHour >= 12 ? "pm" : "am";
  const hour = rawHour % 12 || 12;
  return minute ? `${hour}:${String(minute).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

function timestamp(ms) {
  return `Today at ${new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function shortTime(ms) {
  return `Today ${new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function clock(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function currentScreen() {
  if (state.screen === "welcome") return WelcomeScreen();
  if (state.screen === "onboarding") return OnboardingScreen();
  if (state.screen === "checklist") return ChecklistScreen();
  if (state.screen === "profiles") return ProfilesScreen();
  if (state.screen === "travel") return TravelScreen();
  if (state.screen === "history") return HistoryScreen();
  if (state.screen === "settings") return SettingsScreen();
  if (state.screen === "how") return HowItWorksScreen();
  return DashboardScreen();
}

function render() {
  $("#app").replaceChildren(currentScreen());
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js?v=phone-ui").catch(() => {}));
}

render();
scheduleSnooze();
