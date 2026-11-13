# Glossary

| Term | Definition | Avoid |
|---|---|---|
| origin | Starting point of the route. | from, departure, start |
| destination | End point of the route. | to, arrival, target |
| location input | What the user types: ICAO code, IATA code or coordinates. | query, search |
| true bearing | Initial great-circle direction from origin to destination, relative to true north, 0–360°. | course, azimuth |
| magnetic variation | Angle between true and magnetic north at the origin (WMM2025), east positive, shown as E/W. | declination, magvar |
| magnetic heading | True bearing corrected by magnetic variation, rounded to 001–360 for the autopilot HDG. | autopilot heading, mag heading |
| distance | Great-circle distance between origin and destination, in NM and km. | range, length |
| blackout zone | NOAA WMM area near a magnetic pole (H < 2,000 nT) where magnetic variation is unreliable. | polar zone |
| caution zone | NOAA WMM area near a magnetic pole (2,000 ≤ H < 6,000 nT) where magnetic variation is less reliable. | polar zone |
| airport database | The airport list from `mwgg/Airports`. | airport index, airport list |
| bundled snapshot | The original `airports.json` of one `mwgg/Airports` commit, stored unchanged in the repo and shipped with the app. | bundle, baked-in data |

The `geomagnetism` library field `decl` keeps its name; our own code uses
"magnetic variation".
