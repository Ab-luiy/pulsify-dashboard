document.addEventListener("DOMContentLoaded", () => {
  const trainingButton = document.getElementById("trainingButton");

  if (trainingButton) {
    trainingButton.addEventListener("click", () => {
      const copy = trainingButton.querySelector(".training-copy");
      const kicker = trainingButton.querySelector(".training-kicker");
      const play = trainingButton.querySelector(".play-disc");

      if (copy) copy.textContent = "VSL slot ready for Frank's recording";
      if (kicker) kicker.textContent = "PROTOTYPE";
      if (play) play.style.display = "none";
    });
  }

  const form = document.getElementById("applicationForm");
  const success = document.getElementById("formSuccess");
  const progress = document.getElementById("progressFill");

  if (!form || !success || !progress) return;

  const steps = Array.from(form.querySelectorAll(".form-step"));
  let currentStep = 0;

  const validators = [
    (step) => step.querySelector("input").value.trim().length > 0,
    (step) => step.querySelector("select").value !== "",
    (step) => step.querySelector("textarea").value.trim().length >= 15,
    (step) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step.querySelector("input").value.trim())
  ];

  const updateProgress = () => {
    progress.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
  };

  const showStep = (index) => {
    steps.forEach((step, stepIndex) => {
      step.classList.toggle("active", stepIndex === index);
      step.classList.remove("has-error");
    });

    currentStep = index;
    updateProgress();

    const field = steps[index].querySelector("input, textarea, select");
    if (field) field.focus();
  };

  const advance = () => {
    const step = steps[currentStep];
    const valid = validators[currentStep](step);

    step.classList.toggle("has-error", !valid);
    if (!valid) return;

    if (currentStep < steps.length - 1) {
      showStep(currentStep + 1);
    }
  };

  form.querySelectorAll(".form-next").forEach((button) => {
    button.addEventListener("click", advance);
  });

  steps.forEach((step, index) => {
    const field = step.querySelector("input, textarea, select");
    if (!field) return;

    field.addEventListener("input", () => step.classList.remove("has-error"));
    field.addEventListener("change", () => step.classList.remove("has-error"));
    field.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.shiftKey) return;
      if (field.tagName === "TEXTAREA") return;
      if (index === steps.length - 1) return;

      event.preventDefault();
      advance();
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const step = steps[currentStep];
    const valid = validators[currentStep](step);
    step.classList.toggle("has-error", !valid);
    if (!valid) return;

    form.hidden = true;
    success.classList.add("visible");
    progress.style.width = "100%";
  });

  showStep(0);
});
