document.addEventListener("DOMContentLoaded", async () => {
  const builderPage = document.querySelector(".pc-builder-layout");
  if (!builderPage) return;

  const STORAGE_KEY = "dre_pc_build";

  const initialBuildState = {
    CPUs: null,
    Motherboards: null,
    RAM: null,
    Storage: null,
    PSUs: null,
    Casings: null,
    "Graphics Cards": null,
    Monitors: null,
  };

  let currentBuild = { ...initialBuildState };
  let compatibility = { cpu_socket_id: null, ram_type_id: null };

  const componentSlots = document.querySelectorAll(".component-slot");
  const summaryList = document.getElementById("summary-list");
  const totalPriceEl = document.getElementById("total-price");
  const addToCartBtn = document.getElementById("add-build-to-cart-btn");
  const modalOverlay = document.getElementById("component-modal-overlay");
  const modalContent = document.getElementById("component-modal-content");

  const saveBuildToStorage = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentBuild));
  };

  const loadBuildFromStorage = () => {
    const savedBuild = localStorage.getItem(STORAGE_KEY);
    if (savedBuild) {
      currentBuild = JSON.parse(savedBuild);
      if (currentBuild.CPUs)
        compatibility.cpu_socket_id = currentBuild.CPUs.cpu_socket_id;
      if (currentBuild.Motherboards)
        compatibility.ram_type_id = currentBuild.Motherboards.ram_type_id;
    }
  };

  const openComponentModal = async (category) => {
    let apiUrl = `/api/builder/components?category=${encodeURIComponent(
      category
    )}`;
    if (category === "Motherboards" && compatibility.cpu_socket_id) {
      apiUrl += `&cpu_socket_id=${compatibility.cpu_socket_id}`;
    }
    if (category === "RAM" && compatibility.ram_type_id) {
      apiUrl += `&ram_type_id=${compatibility.ram_type_id}`;
    }

    const response = await fetch(apiUrl);
    const components = await response.json();

    modalContent.innerHTML = `
            <div class="modal-header">
                <h3>Choose a ${category.replace(/s$/, "")}</h3>
                <button class="modal-close-btn">&times;</button>
            </div>
            <div class="component-grid">
                ${
                  components.length > 0
                    ? components
                        .map(
                          (c) => `
                    <div class="component-card" data-component-id="${c.id}">
                        <img src="${
                          c.image || "https://via.placeholder.com/100.png"
                        }" alt="${c.name}">
                        <h5>${c.name}</h5>
                        <p>${new Intl.NumberFormat("en-PH", {
                          style: "currency",
                          currency: "PHP",
                        }).format(c.sale_price || c.price)}</p>
                    </div>
                `
                        )
                        .join("")
                    : "<p>No compatible components found or required parts not selected.</p>"
                }
            </div>
        `;
    modalOverlay.style.display = "flex";

    document.querySelectorAll(".component-card").forEach((card) => {
      card.addEventListener("click", () => {
        const componentId = Number(card.dataset.componentId);
        const selectedComponent = components.find((c) => c.id === componentId);
        selectComponent(category, selectedComponent);
        closeComponentModal();
      });
    });
  };

  const closeComponentModal = () => {
    modalOverlay.style.display = "none";
  };

  const selectComponent = (category, component) => {
    currentBuild[category] = component;
    if (category === "CPUs" && component.cpu_socket_id) {
      compatibility.cpu_socket_id = component.cpu_socket_id;
      if (
        currentBuild.Motherboards &&
        currentBuild.Motherboards.cpu_socket_id !== compatibility.cpu_socket_id
      ) {
        removeComponent("Motherboards");
      }
    }
    if (category === "Motherboards") {
      if (component.cpu_socket_id)
        compatibility.cpu_socket_id = component.cpu_socket_id;
      if (component.ram_type_id)
        compatibility.ram_type_id = component.ram_type_id;
      if (
        currentBuild.RAM &&
        currentBuild.RAM.ram_type_id !== compatibility.ram_type_id
      ) {
        removeComponent("RAM");
      }
    }
    saveBuildToStorage();
    updateUI();
  };

  const removeComponent = (category) => {
    currentBuild[category] = null;
    if (category === "CPUs") {
      compatibility.cpu_socket_id = null;
      removeComponent("Motherboards");
    }
    if (category === "Motherboards") {
      compatibility.ram_type_id = null;
      removeComponent("RAM");
    }
    saveBuildToStorage();
    updateUI();
  };

  const updateUI = () => {
    let totalPrice = 0;
    let isBuildComplete = true;

    summaryList.innerHTML = "";

    componentSlots.forEach((slot) => {
      const category = slot.dataset.category;
      const component = currentBuild[category];
      const selectionDiv = slot.querySelector(".slot-selection");
      const isRequired = slot.querySelector(".required-tag");

      if (component) {
        const price = component.sale_price || component.price;
        totalPrice += price;
        selectionDiv.innerHTML = `
                    <div class="selected-component">
                        <img src="${
                          component.image ||
                          "https://via.placeholder.com/60.png"
                        }" alt="${component.name}">
                        <div class="selected-component-info">
                            <h4>${component.name}</h4>
                            <p>${new Intl.NumberFormat("en-PH", {
                              style: "currency",
                              currency: "PHP",
                            }).format(price)}</p>
                        </div>
                        <button class="btn-remove-component" data-category="${category}">&times;</button>
                    </div>
                `;
        const li = document.createElement("li");
        li.className = "summary-item";
        li.innerHTML = `
                    <span class="item-name">${category.replace(/s$/, "")}: ${
          component.name
        }</span>
                    <span class="item-price">${new Intl.NumberFormat("en-PH", {
                      style: "currency",
                      currency: "PHP",
                    }).format(price)}</span>
                `;
        summaryList.appendChild(li);
      } else {
        selectionDiv.innerHTML = `<button class="btn-choose">Choose a ${category.replace(
          /s$/,
          ""
        )}</button>`;
        if (isRequired) isBuildComplete = false;
      }
    });

    totalPriceEl.textContent = new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(totalPrice);

    const setButtonDisabled = (category, isDisabled) => {
      const button = document.querySelector(
        `[data-category="${category}"] .btn-choose`
      );
      if (button) button.disabled = isDisabled;
    };
    setButtonDisabled("Motherboards", !currentBuild.CPUs);
    setButtonDisabled("RAM", !currentBuild.Motherboards);
    setButtonDisabled("Storage", !currentBuild.Motherboards);
    setButtonDisabled("PSUs", !currentBuild.Motherboards);
    setButtonDisabled("Casings", !currentBuild.Motherboards);
    setButtonDisabled("Graphics Cards", !currentBuild.Motherboards);
    setButtonDisabled("Monitors", !currentBuild.Motherboards);

    addToCartBtn.disabled = !isBuildComplete;
  };

  document
    .querySelector(".builder-blueprint")
    .addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-choose")) {
        const category = e.target.closest(".component-slot").dataset.category;
        openComponentModal(category);
      }
      if (e.target.classList.contains("btn-remove-component")) {
        const category = e.target.dataset.category;
        removeComponent(category);
      }
    });

  modalOverlay.addEventListener("click", (e) => {
    if (
      e.target === modalOverlay ||
      e.target.classList.contains("modal-close-btn")
    ) {
      closeComponentModal();
    }
  });

  addToCartBtn.addEventListener("click", async () => {
    let totalPrice = 0;
    for (const category in currentBuild) {
      if (currentBuild[category])
        totalPrice +=
          currentBuild[category].sale_price || currentBuild[category].price;
    }
    const buildAsCartItem = {
      id: `build-${Date.now()}`,
      name: "Custom PC Build",
      price: totalPrice,
      // Use the placeholder image for PC builds
      image: currentBuild.Casings
        ? currentBuild.Casings.image
        : "https://sqpfjdookptzlzkqtmlw.supabase.co/storage/v1/object/public/assets/pc_build_placeholder.png",
    };
    await cart.addItem(buildAsCartItem);
    updateCartUI();
    toggleCartPanel();
    localStorage.removeItem(STORAGE_KEY);
    currentBuild = { ...initialBuildState };
    updateUI();
  });

  loadBuildFromStorage();
  updateUI();
});