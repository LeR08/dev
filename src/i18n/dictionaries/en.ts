/**
 * The canonical dictionary. Every other locale is typed against this shape, so
 * a missing or renamed key is a compile error rather than a blank on the page.
 */
export const en = {
  meta: {
    siteName: 'The Smoke Trail',
    tagline: 'Licensed Amsterdam coffeeshops: where they are and when they are open',
    homeDescription:
      'Every licensed coffeeshop in Amsterdam on one map, with opening hours, addresses and their source. No products, no prices.',
    venueDescription: `{name} — licensed coffeeshop at {where}, Amsterdam. Opening hours, location and visitor reviews.`,
    neighbourhoodDescription: `{count} licensed coffeeshops in {name}, Amsterdam, with addresses and opening hours.`,
  },
  nav: {
    skip: 'Skip to content',
    neighbourhoods: 'Neighbourhoods',
    data: 'Data',
    language: 'Language',
    toLight: 'Switch to the light theme',
    toDark: 'Switch to the dark theme',
  },
  ageGate: {
    title: 'You must be 18 or over',
    body: 'This is an informational directory of licensed coffeeshops in Amsterdam. Dutch law restricts access to these venues to adults aged 18 and over. This site lists no products and no prices.',
    confirm: 'I am 18 or over',
    leave: 'Leave this site',
    note: 'Your choice is stored in this browser only. Nothing is sent to a server.',
  },
  home: {
    heading: `{count} licensed coffeeshops in Amsterdam`,
    intro:
      'Addresses, opening hours and the licence behind each one, built from the city’s own register.',
    updated: `Updated {date}`,
    noProducts: 'A directory of venues — no products, no prices.',
  },
  search: {
    label: 'Search coffeeshops by name, street or neighbourhood',
    placeholder: 'Search by name, street or neighbourhood',
  },
  nearMe: {
    cta: 'Find venues near me',
    waiting: 'Waiting for your browser…',
    note: 'Your location is used in this browser to sort the list. It is never sent to us.',
    sorting: 'Sorting by distance from your location',
    clear: 'Clear',
    denied: 'No problem — location access is off.',
    unavailable: 'This browser does not offer location access.',
    pick: 'Pick a neighbourhood instead:',
    all: 'All neighbourhoods',
    neighbourhood: 'Neighbourhood',
  },
  filters: {
    legend: 'Filters',
    openNow: 'Open now',
    openLate: 'Open after 23:00',
    terrace: 'Terrace',
    wheelchair: 'Wheelchair access',
    highlyRated: 'Rated 4+',
    hasReviews: 'Has reviews',
    neighbourhood: 'Neighbourhood',
    includeClosed: 'Include closed',
  },
  sort: {
    label: 'Sort',
    name: 'Name',
    rating: 'Rating',
    distance: 'Distance',
    updated: 'Recently updated',
  },
  list: {
    venues: 'Venues',
    count: { one: `{count} venue`, other: `{count} venues` },
    inNeighbourhood: `in {name}`,
    empty: 'No venues match all of these filters.',
    drop: `Drop “{label}” to see {gain}`,
    clearAll: 'Clear all filters',
    list: 'List',
    map: 'Map',
    away: `{distance} away`,
    details: 'Details',
    closePreview: 'Close preview',
    mapFailed: 'The map could not load. The list beside it has every venue.',
  },
  badge: {
    openUntil: `Open until {time}`,
    closingSoon: `Closing soon · {time}`,
    opensAt: `Opens at {time}`,
    closed: 'Closed',
    unknown: 'Hours unknown',
    permanentlyClosed: 'Permanently closed',
    renamed: 'Renamed',
  },
  venue: {
    breadcrumb: 'All venues',
    where: 'Where',
    openingHours: 'Opening hours',
    details: 'Details',
    reviews: 'Reviews',
    reviewsSoon:
      'Visitor reviews are not open yet. We host our own reviews rather than copying them from other sites.',
    nearby: 'Closest venues',
    copyAddress: 'Copy address',
    copied: 'Address copied',
    directionsGoogle: 'Directions (Google)',
    directionsApple: 'Directions (Apple)',
    website: 'Website',
    phone: 'Phone',
    licence: 'Licence',
    validTo: `valid to {date}`,
    weeklyCaption: `Weekly opening hours for {name}`,
    closedNotice:
      'This venue no longer appears in the city’s register of granted operating licences. It is kept here so the address stays searchable.',
    renamedNotice: 'This venue has been renamed.',
    terrace: 'Terrace',
    wheelchair: 'Wheelchair accessible',
    wifi: 'Wi-Fi',
    socials: `Follow`,
    chainAccount: `Chain account, shared with other branches`,
    renewalPending: `The licence for this venue passed its end date on {date} and the city has not yet published a renewal. In this register that normally means a renewal in progress rather than a closure — but check before travelling.`,
    websiteDown: `This website did not respond on the last check.`,
  },
  hours: {
    community: 'Corrected by a verified community report',
    osm: 'Hours from OpenStreetMap',
    licence: 'Hours from the Amsterdam operating licence',
    updated: `, updated {date}`,
    qualifier:
      'These are the hours the licence permits — the actual closing time may be earlier.',
    none: 'No opening hours are recorded for this venue.',
    contribute: 'Know them? Use the report link below.',
    unknown: 'Hours unknown.',
  },
  report: {
    open: 'Report incorrect information',
    title: `Report incorrect information about {name}`,
    what: 'What is wrong?',
    wrongHours: 'The opening hours are wrong',
    closed: 'This venue has closed',
    wrongAddress: 'The address is wrong',
    other: 'Something else',
    details: 'Details (optional)',
    send: 'Send report',
    sent: 'Thank you — a moderator will check this.',
    unavailable: 'Reports are not being collected yet. Nothing was sent and nothing was stored.',
  },
  neighbourhoods: {
    title: 'Neighbourhoods',
    intro:
      'Boundaries come from the city’s own district layer, so a venue sits in the same district the municipality places it in.',
    heading: `Coffeeshops in {name}`,
    count: { one: `{count} venue on record.`, other: `{count} venues on record.` },
    seeOnMap: `See {name} on the map`,
  },
  aboutData: {
    title: 'Where this data comes from',
    intro:
      'This site combines two public datasets and adds nothing to them beyond structure. Every field on a venue page names the source it came from.',
    attribution: 'Attribution',
    licenceTitle: '1. Amsterdam operating-licence register',
    licenceBody:
      'The city publishes every granted operating licence as an open WFS service under CC BY 4.0. We select the records whose category or specification is “Coffeeshop”, whose permit status is granted, and whose end date has not passed. That register decides which venues exist here, what they are called officially, and where they are.',
    licenceHours:
      'The licence also carries opening times. Those are the hours the permit allows — commonly 07:00 to 01:00 — not the hours a venue actually trades. We show them only when nothing better is available, and always with that caveat attached.',
    osmTitle: '2. OpenStreetMap',
    osmBody:
      'Websites, phone numbers, accessibility, terraces and real opening hours come from OpenStreetMap, queried once per night. An OSM record is only attached to a licensed venue when it is within 40 m with a similar name, shares the exact street and house number, or carries a near-identical name within 150 m. Anything else waits in a review queue rather than being published.',
    reviewsTitle: '3. Reviews and ratings',
    reviewsBody:
      'Reviews will be written here by visitors and stored by us. We do not copy ratings or reviews from Google, TripAdvisor or anywhere else.',
    cadenceTitle: 'Update cadence and current state',
    cadenceBody:
      'The pipeline runs nightly at 03:00 Europe/Amsterdam. A run that returns implausible data is abandoned and the previous snapshot is kept, so a broken upstream response can never empty this directory. A venue that disappears from the licence register for two consecutive runs is marked closed — never deleted, because “is this place still open?” is a question worth answering.',
    statVenues: 'Venues listed',
    statOpen: 'Currently licensed',
    statOsm: 'Hours from OpenStreetMap',
    statLicence: 'Hours from the licence only',
    statUnknown: 'Hours unknown',
    statGenerated: 'Snapshot generated',
    notTitle: 'What this site does not do',
    not1: 'No product menus, strains, prices, potency or stock.',
    not2: 'No ordering, booking or delivery.',
    not3: 'No sponsored placement and no advertising.',
    not4: 'No content aimed at anyone under 18.',
    verify:
      'Licences and opening hours change faster than any nightly job. Verify locally before travelling to a venue.',
    seeAlso: 'See also our privacy notice',
  },
  privacy: {
    title: 'Privacy',
    locationTitle: 'Your location',
    locationBody:
      'When you tap “find venues near me”, your browser asks for permission and hands your coordinates to the page. Distances are calculated on your device. Your coordinates are never transmitted to us, never logged and never stored. Refusing the prompt costs you nothing but distance sorting — every other feature works.',
    storedTitle: 'What is stored in your browser',
    storedBody:
      'Three values, all local to this browser: your confirmation that you are 18 or over, your light/dark preference, and your language. Clearing site data removes them.',
    analyticsTitle: 'Analytics',
    analyticsBody:
      'No third-party analytics and no advertising or tracking cookies. If usage counting is ever added it will be cookie-free and self-hosted.',
    reviewsTitle: 'Reviews and reports',
    reviewsBody:
      'Reviews are not open yet. When they are, an account will store a user id, a display name and timestamps — nothing more. You will be able to export and delete your data, and the lawful basis will be the consent you give at signup. Raw IP addresses are not retained; rate limiting uses a short-lived hashed key that cannot be reversed into an address.',
    contactTitle: 'Contact',
    contactBody:
      'For a data request or a correction, use the report link on any venue page. This notice will be reviewed by a Dutch lawyer before reviews open to the public.',
  },
  notFound: {
    title: 'Page not found',
    body: 'If you were looking for a venue that used to be listed here, try searching for it by name — closed venues stay on the site.',
    cta: 'Back to the directory',
  },
  footer: {
    sources: 'Data sources',
    howCollected: 'How this data is collected',
    health: 'Health and safety',
    about: 'About',
    privacy: 'Privacy',
    adults: 'Strictly 18+. Informational only.',
    verify: 'Licences and opening hours change. Verify locally before travelling to a venue.',
  },
};

/** Literal types are deliberately widened so other locales differ in wording, not in shape. */
export type Dictionary = typeof en;
