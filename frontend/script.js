document.addEventListener("DOMContentLoaded", () => {
  const toast = document.getElementById("toast");

  function showToast(message, isError = false) {
    toast.textContent = message;
    toast.style.borderColor = isError
      ? "rgba(255, 77, 141, 0.35)"
      : "rgba(65, 209, 255, 0.35)";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2600);
  }

  async function checkApi() {
    try {
      const response = await fetch(`${window.API_CONFIG.baseUrl}/api/health`);
      const data = await response.json();

      if (response.ok) {
        showToast(`API OK : ${data.message}`);
      } else {
        showToast("API en erreur.", true);
      }
    } catch (error) {
      showToast("Impossible de joindre le backend.", true);
    }
  }

  const checkApiBtn = document.getElementById("checkApiBtn");
  const ctaApiBtn = document.getElementById("ctaApiBtn");
  const startBtn = document.getElementById("startBtn");
  const heroStartBtn = document.getElementById("heroStartBtn");
  const heroDiscoverBtn = document.getElementById("heroDiscoverBtn");
  const ctaStartBtn = document.getElementById("ctaStartBtn");

  const goProfile = document.getElementById("goProfile");
  const goMatches = document.getElementById("goMatches");
  const previewDiscover = document.getElementById("previewDiscover");
  const previewMatches = document.getElementById("previewMatches");
  const previewMessages = document.getElementById("previewMessages");
  const previewProfile = document.getElementById("previewProfile");

  if (checkApiBtn) checkApiBtn.addEventListener("click", checkApi);
  if (ctaApiBtn) ctaApiBtn.addEventListener("click", checkApi);

  const showComingSoon = (txt) => showToast(`${txt} à créer ensuite.`);

  if (startBtn) startBtn.addEventListener("click", () => showComingSoon("Page register"));
  if (heroStartBtn) heroStartBtn.addEventListener("click", () => showComingSoon("Page register"));
  if (ctaStartBtn) ctaStartBtn.addEventListener("click", () => showComingSoon("Onboarding"));

  if (heroDiscoverBtn)
    heroDiscoverBtn.addEventListener("click", () => showComingSoon("Page discover"));

  if (goProfile)
    goProfile.addEventListener("click", (e) => {
      e.preventDefault();
      showComingSoon("Page profile");
    });

  if (goMatches)
    goMatches.addEventListener("click", (e) => {
      e.preventDefault();
      showComingSoon("Page matches");
    });

  if (previewDiscover)
    previewDiscover.addEventListener("click", (e) => {
      e.preventDefault();
      showToast("Future page: discover.html");
    });

  if (previewMatches)
    previewMatches.addEventListener("click", (e) => {
      e.preventDefault();
      showToast("Future page: matches.html");
    });

  if (previewMessages)
    previewMessages.addEventListener("click", (e) => {
      e.preventDefault();
      showToast("Future page: messages.html");
    });

  if (previewProfile)
    previewProfile.addEventListener("click", (e) => {
      e.preventDefault();
      showToast("Future page: profile.html");
    });

  const revealElements = document.querySelectorAll(".reveal");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
        }
      });
    },
    { threshold: 0.15 }
  );

  revealElements.forEach((el) => observer.observe(el));
});
