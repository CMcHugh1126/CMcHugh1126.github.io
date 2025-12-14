
const dataCenters = [
  {
    name: "Ashburn Data Center Cluster",
    operator: "Multiple operators",
    city: "Ashburn, VA",
    lat: 39.0438,
    lon: -77.4874
  },
  {
    name: "Manassas / Prince William Data Center Area",
    operator: "Multiple operators",
    city: "Manassas, VA",
    lat: 38.7509,
    lon: -77.4753
  },
  {
    name: "Fairfax / Herndon Data Center Area",
    operator: "Multiple operators",
    city: "Herndon, VA",
    lat: 38.964,
    lon: -77.3861
  },
  {
    name: "Leesburg Peripheral Data Center Zone",
    operator: "Multiple operators",
    city: "Leesburg, VA",
    lat: 39.1157,
    lon: -77.5636
  }
];

const OPENCAGE_API_KEY = "900d44ccba4046aca9c50c9813cc501b";


async function geocodeAddressReal(address) {
  const encoded = encodeURIComponent(address);


  const novaLat = 38.9;
  const novaLon = -77.4;

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encoded}&key=${OPENCAGE_API_KEY}&limit=1&countrycode=us&no_annotations=1&proximity=${novaLat}%2C${novaLon}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Network response not ok");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("No results found for that address.");
  }

  const result = data.results[0];
  const { lat, lng } = result.geometry;

  return {
    lat,
    lon: lng,
    formatted: result.formatted || address
  };
}

// --- Haversine formula for distance ---
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function kmToMiles(km) {
  return km * 0.621371;
}

// - nearest data center -
function findNearestDataCenter(userLat, userLon) {
  let best = null;

  dataCenters.forEach((dc) => {
    const dKm = distanceKm(userLat, userLon, dc.lat, dc.lon);
    if (!best || dKm < best.distanceKm) {
      best = {
        ...dc,
        distanceKm: dKm,
        distanceMiles: kmToMiles(dKm)
      };
    }
  });

  return best;
}

// - Randomized explanation messages -
const explanations = [
  "This doesn’t mean the buildings are visible from your home, it simply shows how close you are to extremely high electricity demand.",
  "Areas near major data centers often feel the effects through grid load, land development, and noise from cooling systems.",
  "Living close to a large data center cluster can mean increased energy costs and more pressure on local infrastructure.",
  "Northern Virginia's rapid data center growth impacts nearby communities in ways that aren't always obvious.",
  "Even if the buildings aren’t in view, data centers influence land use, traffic patterns, and energy consumption in surrounding areas.",
  "This distance highlights how closely residential areas and data center infrastructure overlap in NOVA."
];

// --- DOM handling ---
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("address-form");
  const addressInput = document.getElementById("address-input");
  const resultDiv = document.getElementById("result");
  const chips = document.querySelectorAll(".chip");

  // Auto-fill when clicking suggestion chips
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const value = chip.getAttribute("data-location");
      addressInput.value = value;
      addressInput.focus();
    });
  });

  // Form submission
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const address = addressInput.value.trim();

    if (!address) {
      resultDiv.textContent = "Please enter an address, city, or ZIP code.";
      return;
    }

    resultDiv.textContent = "Looking up your closest data center...";

    try {

      const { lat, lon, formatted } = await geocodeAddressReal(address);

      const nearest = findNearestDataCenter(lat, lon);

      if (!nearest) {
        resultDiv.textContent =
          "No data centers found in the current dataset.";
        return;
      }

      const miles = nearest.distanceMiles.toFixed(1);

      // Pick a random explanation
      const randomExplanation =
        explanations[Math.floor(Math.random() * explanations.length)];

      resultDiv.innerHTML = `
        <p>We interpreted your location as: <strong>${formatted}</strong>.</p>
        <p>Your closest major data center cluster is:</p>
        <p><strong>${nearest.name}</strong> in <strong>${nearest.city}</strong>,
        approximately <strong>${miles} miles</strong> away.</p>
        <p class="result-note">${randomExplanation}</p>
      `;
    } catch (error) {
      console.error(error);
      resultDiv.textContent =
        "There was a problem looking up that address. Please check the spelling and try again.";
    }
  });
});
