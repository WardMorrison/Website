// 1) Initialize Map with MapLibre GL JS
function calculateMinZoom() {
    const containerHeight = document.getElementById("map").offsetHeight;
    return Math.ceil(Math.log2(containerHeight / 256));
  }
  let dynamicMinZoom = calculateMinZoom();
  let adjustedMinZoom = Math.max(0, Math.floor(dynamicMinZoom * 0.5));
  
  var map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [-98.5795, 39.8283],
    zoom: adjustedMinZoom + 3,
    minZoom: adjustedMinZoom
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }));
  map.gestureHandling && map.gestureHandling.enable();
  
  // Override wheel event to use SmoothZoom plugin with 50ms duration, reducing zoom speed to 85%
  map.getCanvas().addEventListener("wheel", function(e) {
    e.preventDefault();
    let delta = e.deltaY;
    let currentZoom = map.getZoom();
    let zoomChange = (-delta / 100) * 0.85;
    let targetZoom = currentZoom + zoomChange;
    targetZoom = Math.max(adjustedMinZoom, Math.min(map.getMaxZoom(), targetZoom));
    map.smoothZoom(targetZoom, 50);
  });
  
  // 2) Custom location marker: use browser geolocation to add a light blue circle marker
  navigator.geolocation.getCurrentPosition(function(position) {
    let userLngLat = [position.coords.longitude, position.coords.latitude];
    let el = document.createElement('div');
    el.className = 'location-marker';
    el.style.width = '16px';
    el.style.height = '16px';
    el.style.backgroundColor = '#ADD8E6';
    el.style.borderRadius = '50%';
    el.style.border = '2px solid #ffffff';
    new maplibregl.Marker(el)
      .setLngLat(userLngLat)
      .setPopup(new maplibregl.Popup({ offset: 25 }).setText("You are here"))
      .addTo(map);
    map.flyTo({ center: userLngLat });
  }, function(error) {
    console.error("Geolocation error:", error);
  });
  
  // 3) College Type Popup: Show on load and filter data based on selection
  document.addEventListener("DOMContentLoaded", function() {
    const popup = document.getElementById("collegeTypePopup");
    popup.style.display = "flex";
    document.getElementById("collegeTypeSubmit").addEventListener("click", function() {
      let selected = document.querySelector('input[name="collegeType"]:checked').value;
      popup.style.display = "none";
      if (window.colleges) {
        let filtered;
        if (selected === "regular") {
          filtered = window.colleges.filter(c => parseInt(c.isCommunityCollege) === 0 && parseInt(c.isTradeSchool) === 0);
        } else if (selected === "community") {
          filtered = window.colleges.filter(c => parseInt(c.isCommunityCollege) === 1);
        } else if (selected === "trade") {
          filtered = window.colleges.filter(c => parseInt(c.isTradeSchool) === 1);
        } else {
          filtered = window.colleges;
        }
        loadColleges(filtered);
      }
    });
  });
  
  // 4) Fetch College Data from colleges.json
  fetch("colleges.json")
    .then(res => res.json())
    .then(data => {
      window.colleges = data;
      // If the popup hasn't filtered yet, load all colleges initially.
      if (!document.getElementById("collegeTypePopup").style.display || document.getElementById("collegeTypePopup").style.display === "none") {
        loadColleges(data);
      }
    });
  let currentMarkers = [];
  function loadColleges(colleges) {
    currentMarkers.forEach(marker => marker.remove());
    currentMarkers = [];
    colleges.forEach(college => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        openSidebar(college);
      });
      let marker = new maplibregl.Marker(el)
        .setLngLat([college.lng, college.lat])
        .addTo(map);
      currentMarkers.push(marker);
    });
  }
  
  // 5) Sidebar Functionality
  function openSidebar(college) {
    document.getElementById("topBar").classList.add("collapsed");
    document.getElementById("filterButtons").style.display = "none";
    setupSlideshow(college.images);
    document.getElementById("collegeName").innerText = college.name;
    document.getElementById("collegeLocation").innerText = college.location;
    document.getElementById("qolRating").innerHTML = getStarString(college.qOfL || 0);
    document.getElementById("academicRating").innerHTML = getStarString(college.academic || 0);
    document.getElementById("socialRating").innerHTML = getStarString(college.social || 0);
    document.getElementById("collegeType").innerText = college.type;
    document.getElementById("collegeSize").innerText = college.size;
    document.getElementById("collegeTuition").innerText = college.tuition;
    document.getElementById("collegeSAT").innerText = college.averageSAT;
    document.getElementById("collegeLocationDetails").innerText = college.locationDetails;
    document.getElementById("collegeDescription").innerText = college.description;
    document.getElementById("collegeSports").innerText = college.sportsDescription;
    document.getElementById("collegeAcademics").innerText = college.academicsDescription;
    const similarList = document.getElementById("similarColleges");
    similarList.innerHTML = "";
    if (college.similarColleges && college.similarColleges.length > 0) {
      college.similarColleges.forEach(sim => {
        let li = document.createElement("li");
        let a = document.createElement("a");
        a.href = "#";
        a.innerText = sim;
        a.addEventListener("click", function(e) {
          e.preventDefault();
          let found = window.colleges.find(c => c.name === sim);
          if (found) {
            openSidebar(found);
            map.flyTo({ center: [found.lng, found.lat], zoom: adjustedMinZoom + 3 });
          }
        });
        li.appendChild(a);
        similarList.appendChild(li);
      });
    } else {
      similarList.innerHTML = "<li>No similar colleges found.</li>";
    }
    document.getElementById("collegeWebsite").href = college.website;
    document.getElementById("commonDataSetBtn").onclick = function() {
      window.open(college.commonDataSetLink, '_blank');
    };
    document.getElementById("sidebar").classList.add("open");
  }
  function setupSlideshow(images) {
    const slideshow = document.getElementById("collegeSlideshow");
    slideshow.innerHTML = "";
    if (!images || images.length === 0) {
      images = ["https://via.placeholder.com/400x200?text=No+Image"];
    }
    images.forEach((url, index) => {
      let img = document.createElement("img");
      img.src = url;
      if (index === 0) img.classList.add("active");
      slideshow.appendChild(img);
    });
    let current = 0;
    setInterval(() => {
      const imgs = slideshow.querySelectorAll("img");
      imgs[current].classList.remove("active");
      current = (current + 1) % imgs.length;
      imgs[current].classList.add("active");
    }, 3000);
  }
  function closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("topBar").classList.remove("collapsed");
    document.getElementById("filterButtons").style.display = "flex";
  }
  document.getElementById("closeSidebar").addEventListener("click", closeSidebar);
  map.on("click", () => {
    if (document.getElementById("sidebar").classList.contains("open")) {
      closeSidebar();
    }
  });
  function getStarString(rating) {
    let stars = "";
    for (let i = 0; i < 5; i++){
      stars += i < rating ? "★" : "☆";
    }
    return stars;
  }
  
  // 6) Search Functionality
  document.getElementById("searchBar").addEventListener("input", function() {
    const query = this.value.toLowerCase();
    const filtered = window.colleges ? window.colleges.filter(c => c.name.toLowerCase().includes(query)) : [];
    loadColleges(filtered);
  });
  
  // 7) Filter Panels Toggle and Close on Map Click
  document.getElementById("filterTuition").addEventListener("click", () => { togglePanel("filterPanelTuition"); });
  document.getElementById("filterSize").addEventListener("click", () => { togglePanel("filterPanelSize"); });
  document.getElementById("filterAcceptance").addEventListener("click", () => { togglePanel("filterPanelAcceptance"); });
  document.getElementById("filterSAT").addEventListener("click", () => { togglePanel("filterPanelSAT"); });
  document.querySelectorAll(".closeFilter").forEach(btn => {
    btn.addEventListener("click", () => { btn.parentElement.style.display = "none"; });
  });
  map.on("click", () => {
    document.querySelectorAll(".filterPanel").forEach(panel => { panel.style.display = "none"; });
  });
  function togglePanel(panelId) {
    document.querySelectorAll(".filterPanel").forEach(panel => {
      if (panel.id === panelId) {
        panel.style.display = (panel.style.display === "block") ? "none" : "block";
      } else {
        panel.style.display = "none";
      }
    });
  }
  
  // 8) Double-Ended Slider for Tuition
  const tuitionSlider = document.getElementById("tuitionSlider");
  noUiSlider.create(tuitionSlider, {
    start: [0, 80000],
    connect: true,
    range: { min: 0, max: 80000 },
    tooltips: false
  });
  tuitionSlider.noUiSlider.on("update", function (values) {
    if (!window.colleges) return;
    const minVal = parseInt(values[0].replace("$", ""), 10);
    const maxVal = parseInt(values[1].replace("$", ""), 10);
    document.getElementById("tuitionRange").innerText = `Tuition: $${minVal} - $${maxVal}`;
    const filtered = window.colleges.filter(c => {
      const tuitionNum = parseInt(c.tuition.toString().replace(/[^0-9]/g, ""), 10);
      return tuitionNum >= minVal && tuitionNum <= maxVal;
    });
    loadColleges(filtered);
  });
  
  // 9) Double-Ended Slider for Size
  const sizeSlider = document.getElementById("sizeSlider");
  noUiSlider.create(sizeSlider, {
    start: [0, 60000],
    connect: true,
    range: { min: 0, max: 60000 },
    tooltips: false
  });
  sizeSlider.noUiSlider.on("update", function (values) {
    if (!window.colleges) return;
    const minSize = parseInt(values[0], 10);
    const maxSize = parseInt(values[1], 10);
    document.getElementById("sizeRange").innerText = `Size: ${minSize/1000}k - ${maxSize/1000}k students`;
    const filtered = window.colleges.filter(c => c.size >= minSize && c.size <= maxSize);
    loadColleges(filtered);
  });
  
  // 10) Double-Ended Slider for Acceptance Rate
  const acceptanceSlider = document.getElementById("acceptanceSlider");
  noUiSlider.create(acceptanceSlider, {
    start: [0, 100],
    connect: true,
    range: { min: 0, max: 100 },
    tooltips: false
  });
  acceptanceSlider.noUiSlider.on("update", function (values) {
    if (!window.colleges) return;
    const minAcc = parseInt(values[0], 10);
    const maxAcc = parseInt(values[1], 10);
    document.getElementById("acceptanceRange").innerText = `Acceptance Rate: ${minAcc}% - ${maxAcc}%`;
    const filtered = window.colleges.filter(c => c.acceptanceRate !== undefined && c.acceptanceRate >= minAcc && c.acceptanceRate <= maxAcc);
    loadColleges(filtered);
  });
  
  // 11) Double-Ended Slider for Average SAT Score
  const satSlider = document.getElementById("satSlider");
  noUiSlider.create(satSlider, {
    start: [400, 1600],
    connect: true,
    range: { min: 400, max: 1600 },
    tooltips: false
  });
  satSlider.noUiSlider.on("update", function (values) {
    if (!window.colleges) return;
    const minSAT = parseInt(values[0], 10);
    const maxSAT = parseInt(values[1], 10);
    document.getElementById("satRange").innerText = `SAT: ${minSAT} - ${maxSAT}`;
    const filtered = window.colleges.filter(c => c.averageSAT !== undefined && c.averageSAT >= minSAT && c.averageSAT <= maxSAT);
    loadColleges(filtered);
  });
// Add behavior to the "Select College Type" button
window.addEventListener("DOMContentLoaded", () => {
    const collegeTypeBtn = document.getElementById("collegeTypeBtn");
    collegeTypeBtn.addEventListener("click", () => {
      const popup = document.getElementById("collegeTypePopup");
      if (popup) popup.style.display = "flex";
    });
  });
    