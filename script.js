// script.js
(() => {
	// Replace with your own API keys
	const UNSPLASH_ACCESS_KEY = "YOUR_UNSPLASH_ACCESS_KEY";
	const OPENWEATHERMAP_API_KEY = "YOUR_OPENWEATHERMAP_API_KEY";

	// Elements
	const yearEl = document.getElementById("year");
	const searchForm = document.getElementById("search-form");
	const searchInput = document.getElementById("search-input");
	const searchBtn = document.getElementById("search-btn");
	const searchLoading = document.getElementById("search-loading");
	const searchStatus = document.getElementById("search-status");
	const destinationsGrid = document.getElementById("destinations-grid");
	const destinationsStatus = document.getElementById("destinations-status");
    const filtersContainer = document.getElementById("filters");
    const filterRegion = document.getElementById("filter-region");
    const filterSeason = document.getElementById("filter-season");
    const filterPrice = document.getElementById("filter-price");

	const weatherForm = document.getElementById("weather-form");
	const weatherCityInput = document.getElementById("weather-city");
	const weatherLoading = document.getElementById("weather-loading");
	const weatherError = document.getElementById("weather-error");
	const weatherLocation = document.getElementById("weather-location");
	const weatherTemp = document.getElementById("weather-temp");
	const weatherDesc = document.getElementById("weather-description");
	const weatherIcon = document.getElementById("weather-icon");
	const unitToggle = document.getElementById("unit-toggle");
	const weatherForecast = document.getElementById("weather-forecast");

	const contactForm = document.getElementById("contact-form");
	const errorName = document.getElementById("error-name");
	const errorEmail = document.getElementById("error-email");
	const errorMessage = document.getElementById("error-message");
	const contactSuccess = document.getElementById("contact-success");

	// Consent banner
	const consentBanner = document.getElementById("consent-banner");
	const consentAccept = document.getElementById("consent-accept");
	const consentDecline = document.getElementById("consent-decline");

	const hamburgerBtn = document.getElementById("hamburger-btn");
	const navLinks = document.getElementById("nav-links");
	const darkModeToggle = document.getElementById("dark-mode-toggle");
	const localeSelect = document.getElementById("locale-select");
	const accentPicker = document.getElementById("accent-picker");

	// Auth elements
	const navAuthLink = document.getElementById("nav-auth");
	const navUserSpan = document.getElementById("nav-user");
	const loginForm = document.getElementById("login-form");
	const loginEmail = document.getElementById("login-email");
	const loginPassword = document.getElementById("login-password");
	const loginRemember = document.getElementById("login-remember");
	const togglePasswordBtn = document.getElementById("toggle-password");
    const loginError = document.getElementById("login-error");
    const loginSuccess = document.getElementById("login-success");
    const linkSignup = document.getElementById("link-signup");
    const linkReset = document.getElementById("link-reset");

	// Favorites section
	const favoritesGrid = document.getElementById("favorites-grid");
    const favoritesStatus = document.getElementById("favorites-status");

    // Detail modal elements
    const detailModal = document.getElementById("detail-modal");
    const detailTitle = document.getElementById("detail-title");
    const detailBody = document.getElementById("detail-body");
    const detailMapIframe = document.getElementById("detail-map-iframe");
    const detailBookHotels = document.getElementById("detail-book-hotels");
    const detailBookFlights = document.getElementById("detail-book-flights");
    const detailReviewsList = document.getElementById("detail-reviews");
    const detailReviewForm = document.getElementById("detail-review-form");
    const detailReviewText = document.getElementById("detail-review-text");
    const detailCloseBtn = document.getElementById("detail-close");

	// Sections for gating
	const homeSection = document.getElementById("home");
	const exploreSection = document.getElementById("explore");
	const weatherSection = document.getElementById("weather");
	const contactSection = document.getElementById("contact");
	const favoritesSection = document.getElementById("favorites");
	const siteFooter = document.querySelector(".site-footer");

	// Pagination state
	let currentPage = 1;
	let itemsPerPage = 6;
	let lastResults = [];
    let activeFilter = "all";
    let filterState = { region: "all", season: "any", price: "any" };
    let detailOpenItem = null;

	// Pagination elements
	const prevPageBtn = document.getElementById("prev-page");
	const nextPageBtn = document.getElementById("next-page");
	const pageInfo = document.getElementById("page-info");

	// State
	let currentQuery = "India";
	let favorites = loadFavorites();
	let theme = loadTheme();
	let tempUnit = loadUnit();
	let locale = loadLocale();

	// Init
	document.addEventListener("DOMContentLoaded", () => {
		yearEl.textContent = new Date().getFullYear();
		applyTheme(theme);
		applyUnit(tempUnit);
		applyLocale(locale);
		applyAccent(loadAccent());
		initSmoothScrolling();
		initHamburgerMenu();
		initAuth();
		initSearch();
        initFilters();
        initDetailModal();
		initWeather();
		initContactForm();
        initSubmissionsModal();
		setBusy(searchLoading, false);
		setBusy(weatherLoading, false);
		renderFavorites();
		const user = loadSession();
		if (user && user.email) {
			loadDestinations(currentQuery);
		} else {
			// Ensure login is visible first
			location.hash = "#login";
		}
		initConsent();
	});

	// Register service worker
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
			navigator.serviceWorker.register('./sw.js').catch(() => {});
		});
	}

	function initConsent() {
		try {
			const status = localStorage.getItem('consent');
			if (!status && consentBanner) consentBanner.classList.remove('hidden');
			if (consentAccept) consentAccept.addEventListener('click', () => {
				localStorage.setItem('consent', 'accepted');
				consentBanner?.classList.add('hidden');
			});
			if (consentDecline) consentDecline.addEventListener('click', () => {
				localStorage.setItem('consent', 'declined');
				consentBanner?.classList.add('hidden');
			});
		} catch {}
	}

	// Utilities
	function debounce(fn, delay = 400) {
		let t;
		return (...args) => {
			clearTimeout(t);
			t = setTimeout(() => fn(...args), delay);
		};
	}

	function setBusy(el, busy) {
		if (!el) return;
		el.setAttribute("aria-busy", String(busy));
		el.style.visibility = busy ? "visible" : "hidden";
	}

	function createEl(tag, attrs = {}, children = []) {
		const el = document.createElement(tag);
		Object.entries(attrs).forEach(([k, v]) => {
			if (k === "className") el.className = v;
			else if (k === "dataset") Object.assign(el.dataset, v);
			else if (k === "text") el.textContent = v;
			else if (k === "html") el.innerHTML = v;
			else el.setAttribute(k, v);
		});
		children.forEach(c => el.appendChild(c));
		return el;
	}

	function sanitize(text, fallback = "Beautiful destination") {
		if (!text) return fallback;
		return String(text).replace(/\s+/g, " ").trim();
	}

// Lightweight analytics (respects consent)
function logEvent(name, data = {}) {
    try {
        const consent = localStorage.getItem('consent');
        if (consent === 'declined') return;
        const evts = JSON.parse(localStorage.getItem('analyticsEvents') || '[]');
        evts.push({ name, data, at: Date.now() });
        localStorage.setItem('analyticsEvents', JSON.stringify(evts));
    } catch {}
}

	// Favorites storage + rendering
	function loadFavorites() {
		try { return JSON.parse(localStorage.getItem("favoriteDestinations") || "{}"); }
		catch { return {}; }
	}
	function saveFavorites() {
		localStorage.setItem("favoriteDestinations", JSON.stringify(favorites));
		renderFavorites();
    logEvent('favorites_updated', { count: Object.keys(favorites).length });
	}
	function renderFavorites() {
		if (!favoritesGrid || !favoritesStatus) return;
		favoritesGrid.innerHTML = "";
		const favItems = Object.values(favorites);
		if (favItems.length === 0) {
			favoritesStatus.textContent = "No favorites yet.";
			return;
		}
		favoritesStatus.textContent = "";
		const fragment = document.createDocumentFragment();
		favItems.forEach((it, idx) => {
			// Ensure object has expected fields
			const safeItem = {
				id: it.id,
				title: it.title || "Favorite destination",
				desc: it.desc || "Saved favorite destination.",
				image: it.image || "",
			};
			const card = createDestinationCard(safeItem);
			setTimeout(() => card.classList.add("show"), 30 * idx);
			fragment.appendChild(card);
		});
		favoritesGrid.appendChild(fragment);
	}

	function loadTheme() {
		return localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
	}
	function applyTheme(next) {
		const isDark = next === "dark";
		document.body.classList.toggle("dark-mode", isDark);
		darkModeToggle.setAttribute("aria-pressed", String(isDark));
		darkModeToggle.textContent = isDark ? "☀️" : "🌙";
		localStorage.setItem("theme", next);
	}

	function loadLocale() {
		return localStorage.getItem("locale") || "en";
	}
	function applyLocale(next) {
		if (localeSelect) localeSelect.value = next;
		localStorage.setItem("locale", next);
	}

	function loadAccent() {
		return localStorage.getItem("accentColor") || "#38bdf8";
	}
	function applyAccent(color) {
		try { document.documentElement.style.setProperty('--accent', color); } catch {}
		localStorage.setItem("accentColor", color);
		if (accentPicker) accentPicker.value = color;
	}

	function loadUnit() {
		return localStorage.getItem("tempUnit") || "C";
	}
	function applyUnit(next) {
		const isC = next === "C";
		if (unitToggle) {
			unitToggle.textContent = isC ? "°C" : "°F";
			unitToggle.setAttribute("aria-pressed", String(!isC));
		}
		localStorage.setItem("tempUnit", next);
	}
	darkModeToggle.addEventListener("click", () => {
		theme = theme === "dark" ? "light" : "dark";
		applyTheme(theme);
	});

	// Smooth scrolling and close menu on click (mobile)
	function initSmoothScrolling() {
		document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
			link.addEventListener("click", (e) => {
				e.preventDefault();
				const id = link.getAttribute("href").slice(1);
				const target = document.getElementById(id);
				if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
				if (navLinks.classList.contains("open")) {
					navLinks.classList.remove("open");
					hamburgerBtn.setAttribute("aria-expanded", "false");
				}
			});
		});
	}

	function initHamburgerMenu() {
		hamburgerBtn.addEventListener("click", () => {
			const isOpen = navLinks.classList.toggle("open");
			hamburgerBtn.setAttribute("aria-expanded", String(isOpen));
		});
	}

	// Locale and accent
	if (localeSelect) {
		localeSelect.addEventListener('change', () => {
			locale = localeSelect.value;
			applyLocale(locale);
		});
	}
	if (accentPicker) {
		accentPicker.addEventListener('input', () => {
			applyAccent(accentPicker.value);
		});
	}

	// Destination Explorer
	function initSearch() {
		searchForm.addEventListener("submit", (e) => {
			e.preventDefault();
			const q = sanitize(searchInput.value) || "Travel";
			if (q !== currentQuery) currentQuery = q;
            loadDestinations(currentQuery);
            logEvent('search_submit', { q: currentQuery });
		});

		searchInput.addEventListener("input", debounce(() => {
			const q = sanitize(searchInput.value);
			currentQuery = q.length === 0 ? "Travel" : q;
            loadDestinations(currentQuery);
            logEvent('search_input', { q: currentQuery });
		}, 500));
	}

	async function loadDestinations(query) {
		destinationsStatus.textContent = `Searching: ${query}…`;
		setBusy(searchLoading, true);
		searchBtn.disabled = true;

		try {
			const photos = await fetchUnsplash(query);
			renderDestinations(photos, query);
			if (!photos.length) {
				destinationsStatus.textContent = "No results found.";
			} else {
				destinationsStatus.textContent = `Showing ${photos.length} result(s) for “${query}”`;
			}
		} catch (err) {
			console.error(err);
			destinationsStatus.textContent = "Something went wrong. Please try again later.";
		} finally {
			setBusy(searchLoading, false);
			searchBtn.disabled = false;
		}
	}

	async function fetchUnsplash(query) {
		if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY.startsWith("YOUR_")) {
			console.warn("Missing Unsplash API key. Returning placeholders.");
			return generatePlaceholders(query);
		}
		const url = new URL("https://api.unsplash.com/search/photos");
		url.searchParams.set("query", query);
		url.searchParams.set("per_page", "12");
		url.searchParams.set("orientation", "landscape");
		url.searchParams.set("content_filter", "high");

		const res = await fetch(url.toString(), {
			headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
		});
		if (!res.ok) throw new Error(`Unsplash error: ${res.status}`);
		const data = await res.json();
		return (data.results || []).map(mapUnsplashToCard);
	}

	function mapUnsplashToCard(item) {
		return {
			id: item.id,
			title: sanitize(item.alt_description, "Scenic destination"),
			desc: sanitize(item.description || (item.tags?.[0]?.title ? `Explore ${item.tags[0].title}` : "Experience an unforgettable trip")),
			image: item.urls?.regular || item.urls?.small || "",
			attribution: item.user?.name || "Unknown",
        link: item.links?.html || "#",
        category: inferCategoryFromText(`${item.alt_description || ""} ${item.description || ""}`),
        region: "all",
        season: "any",
        price: "mid"
		};
	}

	function generatePlaceholders(query) {
		// Curated famous Indian destinations for when no API key is provided
		const images = [
			"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1470770903676-69b98201ea1c?q=80&w=1600&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1600&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1600&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1600&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop"
		];

    const indian = [
        { title: "Mumbai, Maharashtra", desc: "Gateway of India, Marine Drive and vibrant Bollywood city.", category: "city", region: "west", season: "winter", price: "mid" },
        { title: "Delhi, National Capital Territory", desc: "Historic forts, Chandni Chowk and cosmopolitan vibes.", category: "city", region: "north", season: "winter", price: "mid" },
        { title: "Jaipur, Rajasthan", desc: "Pink City with Hawa Mahal and Amer Fort.", category: "heritage", region: "west", season: "winter", price: "mid" },
        { title: "Agra, Uttar Pradesh", desc: "Home of the Taj Mahal on the Yamuna.", category: "heritage", region: "north", season: "winter", price: "budget" },
        { title: "Goa", desc: "Beaches, Portuguese heritage and buzzing nightlife.", category: "beach", region: "west", season: "winter", price: "mid" },
        { title: "Varanasi, Uttar Pradesh", desc: "Sacred ghats, Ganga aarti and timeless spirituality.", category: "spiritual", region: "north", season: "winter", price: "budget" },
        { title: "Udaipur, Rajasthan", desc: "Lakes, palaces and romantic old-city lanes.", category: "heritage", region: "west", season: "winter", price: "mid" },
        { title: "Ladakh, Jammu & Kashmir", desc: "Himalayan landscapes, monasteries and high-altitude passes.", category: "mountain", region: "north", season: "summer", price: "premium" },
        { title: "Rishikesh, Uttarakhand", desc: "Yoga capital, Ganga rafting and serene foothills.", category: "spiritual", region: "north", season: "winter", price: "budget" },
        { title: "Kerala Backwaters", desc: "Alleppey houseboats, coconut groves and tranquil canals.", category: "beach", region: "south", season: "winter", price: "mid" },
        { title: "Hampi, Karnataka", desc: "UNESCO ruins, boulder-strewn hills and temple architecture.", category: "heritage", region: "south", season: "winter", price: "budget" },
        { title: "Andaman & Nicobar Islands", desc: "Coral reefs, clear waters and tropical beaches.", category: "beach", region: "east", season: "winter", price: "premium" }
    ];

    return indian.slice(0, 12).map((place, i) => ({
			id: place.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + i,
			title: place.title,
			desc: place.desc,
			image: images[i % images.length],
			attribution: "Unsplash",
			link: "#",
        category: place.category,
        region: place.region,
        season: place.season,
        price: place.price
		}));
	}

	function renderDestinations(items, query) {
		lastResults = items;
		currentPage = 1;
		renderPage();
		searchStatus.textContent = `Results for “${query}”`;
	}

// Favorites export/import
	const exportBtn = document.getElementById('favorites-export');
	const importInput = document.getElementById('favorites-import-input');
	if (exportBtn) {
		exportBtn.addEventListener('click', () => {
			const blob = new Blob([JSON.stringify(favorites, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'favorites.json';
			a.click();
			URL.revokeObjectURL(url);
		});
	}
	if (importInput) {
		importInput.addEventListener('change', async () => {
			const file = importInput.files && importInput.files[0];
			if (!file) return;
			try {
				const text = await file.text();
				const obj = JSON.parse(text);
				if (obj && typeof obj === 'object') {
					favorites = obj;
					saveFavorites();
				}
			} catch {}
			importInput.value = '';
		});
	}

function renderPage() {
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
    let filtered = activeFilter === "all" ? lastResults : lastResults.filter(x => (x.category || "").includes(activeFilter));
    if (filterState.region !== 'all') filtered = filtered.filter(x => (x.region || 'all') === filterState.region);
    if (filterState.season !== 'any') filtered = filtered.filter(x => (x.season || 'any') === filterState.season);
    if (filterState.price !== 'any') filtered = filtered.filter(x => (x.price || 'any') === filterState.price);
		const pageItems = filtered.slice(start, end);

		destinationsGrid.innerHTML = "";
		const fragment = document.createDocumentFragment();
    pageItems.forEach((it, idx) => {
        const card = createDestinationCard(it);
        card.addEventListener('click', () => {
            openDetailModal(it);
        });
        setTimeout(() => card.classList.add("show"), 40 * idx);
        fragment.appendChild(card);
    });
		destinationsGrid.appendChild(fragment);

		const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
		pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
		prevPageBtn.disabled = currentPage === 1;
		nextPageBtn.disabled = currentPage >= totalPages;
	}

	prevPageBtn.addEventListener("click", () => {
		if (currentPage > 1) {
			currentPage--;
			renderPage();
		}
	});
nextPageBtn.addEventListener("click", () => {
    let filtered = activeFilter === "all" ? lastResults : lastResults.filter(x => (x.category || "").includes(activeFilter));
    if (filterState.region !== 'all') filtered = filtered.filter(x => (x.region || 'all') === filterState.region);
    if (filterState.season !== 'any') filtered = filtered.filter(x => (x.season || 'any') === filterState.season);
    if (filterState.price !== 'any') filtered = filtered.filter(x => (x.price || 'any') === filterState.price);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
		if (currentPage < totalPages) {
			currentPage++;
			renderPage();
		}
	});

	function createDestinationCard(item) {
		const card = createEl("article", { className: "card", tabindex: "0", role: "article" });

		const isFav = Boolean(favorites[item.id]);
		const favBtn = createEl("button", {
			className: "card-fav",
			title: "Save to favorites",
			"aria-label": "Save to favorites",
			"data-id": item.id
		});
		favBtn.dataset.active = isFav ? "true" : "false";
		favBtn.innerHTML = isFav ? "♥" : "♡";
		favBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			const active = favBtn.dataset.active === "true";
			if (active) {
				delete favorites[item.id];
			} else {
				favorites[item.id] = { id: item.id, title: item.title, image: item.image, desc: item.desc };
			}
			saveFavorites();
			const nowActive = !active;
			favBtn.dataset.active = String(nowActive);
			favBtn.innerHTML = nowActive ? "♥" : "♡";
		});

		const imgWrap = createEl("div", { className: "card-img-wrap" });
		const img = new Image();
		img.alt = item.title || "Destination";
		img.loading = "lazy";
		img.src = item.image || "";
		img.addEventListener("load", () => card.classList.add("show"));
		imgWrap.appendChild(img);

		const body = createEl("div", { className: "card-body" });
		const title = createEl("h3", { className: "card-title", text: item.title || "Destination" });
		const desc = createEl("p", { className: "card-desc", text: item.desc || "Explore this amazing place." });

		body.appendChild(title);
		body.appendChild(desc);

		card.appendChild(favBtn);
		card.appendChild(imgWrap);
		card.appendChild(body);

		return card;
	}

	function inferCategoryFromText(text) {
		const t = (text || "").toLowerCase();
		if (/beach|island|coast|sea|ocean/.test(t)) return "beach";
		if (/fort|palace|temple|monument|unesco|heritage|mahal/.test(t)) return "heritage";
		if (/mountain|himalaya|peak|trek|pass/.test(t)) return "mountain";
		if (/ashram|ghat|aarti|spiritual|sacred|yoga/.test(t)) return "spiritual";
		if (/city|skyline|downtown|urban/.test(t)) return "city";
		return "city";
	}

	function initFilters() {
		if (!filtersContainer) return;
		filtersContainer.querySelectorAll('button[data-filter]').forEach(btn => {
			btn.addEventListener('click', () => {
				filtersContainer.querySelectorAll('button[data-filter]').forEach(b => b.setAttribute('aria-pressed', 'false'));
				btn.setAttribute('aria-pressed', 'true');
				activeFilter = btn.getAttribute('data-filter') || 'all';
				currentPage = 1;
				renderPage();
			});
		});
    if (filterRegion) filterRegion.addEventListener('change', () => { filterState.region = filterRegion.value; currentPage = 1; renderPage(); });
    if (filterSeason) filterSeason.addEventListener('change', () => { filterState.season = filterSeason.value; currentPage = 1; renderPage(); });
    if (filterPrice) filterPrice.addEventListener('change', () => { filterState.price = filterPrice.value; currentPage = 1; renderPage(); });
	}

// Detail Modal and Reviews
function initDetailModal() {
    if (detailCloseBtn && detailModal) {
        detailCloseBtn.addEventListener('click', () => closeDetailModal());
    }
    if (detailReviewForm && detailReviewText) {
        detailReviewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const txt = sanitize(detailReviewText.value);
            if (!txt || !detailOpenItem) return;
            const reviews = loadReviews();
            reviews[detailOpenItem.id] = reviews[detailOpenItem.id] || [];
            reviews[detailOpenItem.id].push({ text: txt, at: Date.now() });
            saveReviews(reviews);
            detailReviewText.value = '';
            renderReviews(detailOpenItem.id);
        });
    }
}
function openDetailModal(item) {
    detailOpenItem = item;
    if (!detailModal) return;
    if (detailTitle) detailTitle.textContent = item.title || 'Destination';
    if (detailBody) detailBody.textContent = item.desc || '';
    if (detailMapIframe) {
        const q = encodeURIComponent(item.title || 'Destination');
        detailMapIframe.src = `https://www.google.com/maps?q=${q}&output=embed`;
    }
    if (detailBookHotels) {
        const q = encodeURIComponent(item.title || 'Destination');
        detailBookHotels.href = `https://www.google.com/travel/hotels?q=${q}`;
    }
    if (detailBookFlights) {
        const q = encodeURIComponent(item.title || 'Destination');
        detailBookFlights.href = `https://www.google.com/travel/flights?q=${q}`;
    }
    renderReviews(item.id);
    detailModal.classList.remove('hidden');
}
function closeDetailModal() {
    if (detailModal) detailModal.classList.add('hidden');
    detailOpenItem = null;
}
function renderReviews(id) {
    if (!detailReviewsList) return;
    detailReviewsList.innerHTML = '';
    const reviews = loadReviews();
    const list = reviews[id] || [];
    list.slice().reverse().forEach(r => {
        const li = document.createElement('li');
        li.textContent = `${new Date(r.at).toLocaleDateString()} — ${r.text}`;
        detailReviewsList.appendChild(li);
    });
}
function loadReviews() { try { return JSON.parse(localStorage.getItem('reviews') || '{}'); } catch { return {}; } }
function saveReviews(r) { localStorage.setItem('reviews', JSON.stringify(r)); }

	// Weather
	function initWeather() {
		if ("geolocation" in navigator) {
			navigator.geolocation.getCurrentPosition(
				async (pos) => {
					const { latitude, longitude } = pos.coords;
					await loadWeatherByCoords(latitude, longitude);
				},
				async () => {
					await loadWeatherByCity("New York");
				},
				{ enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
			);
		} else {
			loadWeatherByCity("New York");
		}

		weatherForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			const city = sanitize(weatherCityInput.value);
			if (!city) return;
			await loadWeatherByCity(city);
		});

		if (unitToggle) {
			unitToggle.addEventListener("click", () => {
				tempUnit = tempUnit === "C" ? "F" : "C";
				applyUnit(tempUnit);
				// Refresh current displayed temperature if data exists by triggering last city search text if present
				const name = weatherLocation.textContent;
				if (name && name !== "—") {
					loadWeatherByCity(name);
				}
			});
		}
	}

	async function loadWeatherByCoords(lat, lon) {
		clearWeatherError();
		setBusy(weatherLoading, true);
		try {
			const data = await fetchWeather({ lat, lon });
			updateWeatherUI(data);
			updateForecastUI(await fetchForecast({ lat, lon }));
		} catch (e) {
			setWeatherError("Unable to fetch weather for your location.");
		} finally {
			setBusy(weatherLoading, false);
		}
	}

	async function loadWeatherByCity(city) {
		clearWeatherError();
		setBusy(weatherLoading, true);
		try {
			const data = await fetchWeather({ city });
			updateWeatherUI(data);
			updateForecastUI(await fetchForecast({ city }));
		} catch (e) {
			setWeatherError("City not found. Try another one.");
		} finally {
			setBusy(weatherLoading, false);
		}
	}

	async function fetchWeather({ lat, lon, city }) {
		if (!OPENWEATHERMAP_API_KEY || OPENWEATHERMAP_API_KEY.startsWith("YOUR_")) {
			return {
				name: city || "Your Location",
				main: { temp: 22 },
				weather: [{ description: "clear sky", icon: "01d" }]
			};
		}
		let url;
		if (city) {
			url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
		} else {
			url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
		}
		const res = await fetch(url);
		if (!res.ok) throw new Error("Weather API error");
		return res.json();
	}

	async function fetchForecast({ lat, lon, city }) {
		if (!OPENWEATHERMAP_API_KEY || OPENWEATHERMAP_API_KEY.startsWith("YOUR_")) {
			// Mock 5-day forecast
			return Array.from({ length: 5 }).map((_, i) => ({ day: `Day ${i+1}`, temp: 22 + i, desc: "clear" }));
		}
		let url;
		if (city) {
			url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
		} else {
			url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
		}
		const res = await fetch(url);
		if (!res.ok) throw new Error("Forecast API error");
		const data = await res.json();
		// Pick one forecast per day (noon)
		const byDay = {};
		(data.list || []).forEach(entry => {
			const date = new Date(entry.dt * 1000);
			const key = date.toISOString().slice(0,10);
			if (!byDay[key] || Math.abs(date.getHours() - 12) < Math.abs(new Date(byDay[key].dt * 1000).getHours() - 12)) {
				byDay[key] = entry;
			}
		});
		return Object.values(byDay).slice(0,5).map(e => ({
			day: new Date(e.dt * 1000).toLocaleDateString(),
			temp: Math.round(e.main?.temp ?? 0),
			desc: e.weather?.[0]?.description || ""
		}));
	}

	function updateForecastUI(items) {
		if (!weatherForecast) return;
		if (!items || items.length === 0) { weatherForecast.textContent = ""; return; }
		const isF = tempUnit === "F";
		const lines = items.map(e => {
			const t = isF ? Math.round((e.temp * 9)/5 + 32) : e.temp;
			return `${e.day}: ${t}°${isF ? 'F' : 'C'} - ${capitalize(e.desc)}`;
		});
		weatherForecast.textContent = lines.join(" | ");
	}

	function updateWeatherUI(data) {
		const name = data.name;
		let tempC = Math.round(data.main?.temp ?? 0);
		const isF = tempUnit === "F";
		const temp = isF ? Math.round((tempC * 9) / 5 + 32) : tempC;
		const w = data.weather?.[0];
		const desc = w?.description ? capitalize(w.description) : "—";
		const icon = w?.icon ? `https://openweathermap.org/img/wn/${w.icon}@2x.png` : "";

		weatherLocation.textContent = name || "—";
		weatherTemp.textContent = Number.isFinite(temp) ? String(temp) : "—";
		weatherDesc.textContent = desc;
		if (icon) {
			weatherIcon.src = icon;
			weatherIcon.alt = desc;
		} else {
			weatherIcon.removeAttribute("src");
			weatherIcon.alt = "";
		}
	}

	function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
	function setWeatherError(msg) { weatherError.textContent = msg; }
	function clearWeatherError() { weatherError.textContent = ""; }

	// Auth
	function loadSession() {
		try { return JSON.parse(localStorage.getItem("sessionUser") || "null"); }
		catch { return null; }
	}
	function saveSession(user) {
		localStorage.setItem("sessionUser", JSON.stringify(user));
	}
	function clearSession() {
		localStorage.removeItem("sessionUser");
	}
	function applyAuthUI(user) {
		const isLoggedIn = Boolean(user && user.email);
		if (navAuthLink) {
			navAuthLink.textContent = isLoggedIn ? "Logout" : "Login";
			navAuthLink.setAttribute("href", isLoggedIn ? "#home" : "#login");
			navAuthLink.setAttribute("aria-label", isLoggedIn ? "Logout" : "Login");
		}
		if (navUserSpan) {
			navUserSpan.textContent = isLoggedIn ? `Hi, ${user.email}` : "";
		}
		const loginSection = document.getElementById("login");
		if (loginSection) {
			loginSection.style.display = isLoggedIn ? "none" : "block";
		}
		setSiteLocked(!isLoggedIn);
		// Force nav hash to safe location when locked
		if (!isLoggedIn) {
			if (location.hash && location.hash !== "#login") location.hash = "#login";
		}
	}

	function initAuth() {
		const existing = loadSession();
		applyAuthUI(existing);

		if (navAuthLink) {
			navAuthLink.addEventListener("click", (e) => {
				const user = loadSession();
                if (user && user.email) {
					e.preventDefault();
					clearSession();
					applyAuthUI(null);
					location.hash = "#login";
                    logEvent('logout', {});
				}
			});
		}

		if (loginForm && loginEmail && loginPassword) {
			loginForm.addEventListener("submit", (e) => {
				e.preventDefault();
				loginError.textContent = "";
				loginSuccess.textContent = "";
				const email = sanitize(loginEmail.value);
				const password = String(loginPassword.value || "");
				if (!isValidEmail(email)) {
					loginError.textContent = "Please enter a valid email.";
					return;
				}
				if (password.length < 4) {
					loginError.textContent = "Password must be at least 4 characters.";
					return;
				}
                const user = { email };
				saveSession(user);
				if (loginRemember && loginRemember.checked) {
					localStorage.setItem("rememberUserEmail", email);
				} else {
					localStorage.removeItem("rememberUserEmail");
				}
				applyAuthUI(user);
				loginForm.reset();
				loginSuccess.textContent = "Signed in successfully.";
				// Navigate to main site and load data
				location.hash = "#home";
				if (!lastResults || lastResults.length === 0) {
					loadDestinations(currentQuery);
				}
                setTimeout(() => { loginSuccess.textContent = ""; }, 1500);
                logEvent('login', {});
			});
		}

		if (togglePasswordBtn && loginPassword) {
			togglePasswordBtn.addEventListener("click", () => {
				const isHidden = loginPassword.type === "password";
				loginPassword.type = isHidden ? "text" : "password";
				togglePasswordBtn.textContent = isHidden ? "Hide" : "Show";
				togglePasswordBtn.setAttribute("aria-pressed", String(isHidden));
				togglePasswordBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
			});
		}

		// Pre-fill remembered email
		const remembered = localStorage.getItem("rememberUserEmail");
		if (remembered && loginEmail) loginEmail.value = remembered;

    // Signup and Reset (mock with rate limit)
    function isRateLimited(key, windowMs = 60000, limit = 3) {
        try {
            const raw = JSON.parse(localStorage.getItem(key) || '[]');
            const now = Date.now();
            const recent = raw.filter(ts => now - ts < windowMs);
            if (recent.length >= limit) return true;
            recent.push(now);
            localStorage.setItem(key, JSON.stringify(recent));
            return false;
        } catch { return false; }
    }
    if (linkSignup) {
        linkSignup.addEventListener('click', (e) => {
            e.preventDefault();
            if (isRateLimited('rl_signup')) { loginError.textContent = 'Too many sign-up attempts. Try later.'; return; }
            const email = prompt('Enter email to sign up:');
            if (!email || !isValidEmail(email)) { loginError.textContent = 'Invalid email.'; return; }
            const pwd = prompt('Create a password (min 4 chars):') || '';
            if (pwd.length < 4) { loginError.textContent = 'Password too short.'; return; }
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            if (users[email]) { loginError.textContent = 'Account already exists.'; return; }
            users[email] = { createdAt: Date.now() };
            localStorage.setItem('users', JSON.stringify(users));
            loginSuccess.textContent = 'Account created. Please sign in.';
            setTimeout(() => { loginSuccess.textContent = ''; }, 2000);
            logEvent('signup', {});
        });
    }
    if (linkReset) {
        linkReset.addEventListener('click', (e) => {
            e.preventDefault();
            if (isRateLimited('rl_reset')) { loginError.textContent = 'Too many reset requests. Try later.'; return; }
            const email = prompt('Enter your account email:');
            if (!email || !isValidEmail(email)) { loginError.textContent = 'Invalid email.'; return; }
            loginSuccess.textContent = 'If your email exists, a reset link was sent (demo).';
            setTimeout(() => { loginSuccess.textContent = ''; }, 2500);
            logEvent('password_reset_request', {});
        });
    }
	}

	function setSiteLocked(locked) {
		const displayStyle = locked ? "none" : "block";
		if (homeSection) homeSection.style.display = displayStyle;
		if (exploreSection) exploreSection.style.display = displayStyle;
		if (weatherSection) weatherSection.style.display = displayStyle;
		if (contactSection) contactSection.style.display = displayStyle;
		if (favoritesSection) favoritesSection.style.display = displayStyle;
		if (siteFooter) siteFooter.style.display = locked ? "none" : "block";
	}

	// Contact form
	function initContactForm() {
		contactForm.addEventListener("submit", (e) => {
			e.preventDefault();
			const name = sanitize(document.getElementById("contact-name").value);
			const email = sanitize(document.getElementById("contact-email").value);
			const message = sanitize(document.getElementById("contact-message").value);

			let valid = true;
			if (!name) { errorName.textContent = "Please enter your name."; valid = false; } else { errorName.textContent = ""; }
			if (!isValidEmail(email)) { errorEmail.textContent = "Please enter a valid email."; valid = false; } else { errorEmail.textContent = ""; }
			if (!message || message.length < 5) { errorMessage.textContent = "Please enter a message (min 5 chars)."; valid = false; } else { errorMessage.textContent = ""; }

			if (!valid) return;

			const submissions = loadSubmissions();
			submissions.push({ name, email, message, at: new Date().toISOString() });
			saveSubmissions(submissions);

			contactSuccess.textContent = "Thanks! Your message has been sent.";
			contactForm.reset();

			setTimeout(() => { contactSuccess.textContent = ""; }, 4000);
		});
	}

	// Contact submissions modal
	function initSubmissionsModal() {
		const submissionsBtn = document.getElementById("view-submissions");
		const submissionsModal = document.getElementById("submissions-modal");
		const submissionsList = document.getElementById("submissions-list");
		const closeModal = document.getElementById("close-modal");

		if (submissionsBtn && submissionsModal && submissionsList && closeModal) {
			submissionsBtn.addEventListener("click", () => {
				const subs = loadSubmissions();
				submissionsList.innerHTML = "";
				if (subs.length === 0) {
					submissionsList.innerHTML = "<li>No submissions yet.</li>";
				} else {
					subs.forEach(s => {
						const li = document.createElement("li");
						li.textContent = `${s.name} (${s.email}) → ${s.message}`;
						submissionsList.appendChild(li);
					});
				}
				submissionsModal.classList.remove("hidden");
			});

			closeModal.addEventListener("click", () => {
				submissionsModal.classList.add("hidden");
			});
		}
	}

	function isValidEmail(email) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
	}
	function loadSubmissions() {
		try { return JSON.parse(localStorage.getItem("contactSubmissions") || "[]"); }
		catch { return []; }
	}
	function saveSubmissions(items) {
		localStorage.setItem("contactSubmissions", JSON.stringify(items));
	}
})();