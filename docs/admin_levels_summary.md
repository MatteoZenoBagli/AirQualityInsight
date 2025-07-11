# OpenStreetMap Administrative Levels Summary

## Overview
Administrative levels in OpenStreetMap use the `admin_level` tag to define hierarchical boundaries from national to local levels. The numbering system goes from 1 (highest/largest) to 11 (lowest/smallest).

## Administrative Levels

### `admin_level=1`
- **Description**: Top-level federal subdivisions
- **Examples**: States (USA), Länder (Germany), Autonomous Communities (Spain)

### `admin_level=2`
- **Description**: Countries/Nations
- **Examples**: Italy, France, Germany, United Kingdom

### `admin_level=3`
- **Description**: First-level subdivisions within countries
- **Examples**: Regions (Italy), Régions (France), States (Germany)

### `admin_level=4`
- **Description**: Second-level subdivisions
- **Examples**: Provinces (Italy), Départements (France), Counties (UK/Ireland)

### `admin_level=5`
- **Description**: Third-level subdivisions
- **Examples**: Districts, Arrondissements, varies by country

### `admin_level=6`
- **Description**: Municipalities/Cities
- **Examples**: Comuni (Italy), Communes (France), Municipalities (general)

### `admin_level=7`
- **Description**: Municipal subdivisions
- **Examples**: City districts, Arrondissements, Administrative districts

### `admin_level=8`
- **Description**: Local subdivisions
- **Examples**: Neighborhoods, Villages, Hamlets, Boroughs

### `admin_level=9`
- **Description**: Very local subdivisions
- **Examples**: Sub-neighborhoods, Small villages

### `admin_level=10`
- **Description**: Micro-local areas
- **Examples**: City blocks, Very small localities

### `admin_level=11`
- **Description**: Smallest administrative units
- **Examples**: Building groups, Specific local areas

## Notes
- The exact meaning of each level varies by country and local administrative structure
- Not all levels are used in every country
- Some countries may have specific interpretations of these levels
- Always verify the actual administrative structure for your specific region when working with OSM data

### References

[OpenStreetMap Wiki | Admin level](https://wiki.openstreetmap.org/wiki/Key:admin_level)
[OpenStreetMap Wiki | Admin level | Country list](https://wiki.openstreetmap.org/wiki/Tag:boundary%3Dadministrative#Country_specific_values_%E2%80%8B%E2%80%8Bof_the_key_admin_level=*)
[OpenStreetMap Wiki | Italy](https://wiki.openstreetmap.org/wiki/Italy)