[out:json][timeout:25];
area["admin_level"=8]["name"="Bologna"]["boundary"="administrative"]->.bologna;
(
  way["highway"="motorway"](area.bologna);
);
out geom;