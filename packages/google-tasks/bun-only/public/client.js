document.addEventListener("DOMContentLoaded", () => {
  const filterInput = document.querySelector("#filter");
  if (filterInput) {
    filterInput.addEventListener("input", () => {
      const q = filterInput.value.toLowerCase();
      document.querySelectorAll("li.task").forEach((li) => {
        const txt = li.textContent.toLowerCase();
        li.style.display = txt.includes(q) ? "" : "none";
      });
    });
  }
});
