class ViewControl {
  sphere_coords = {
    theta_deg: 90,
    phi_deg: 0
  }
  camera_pos = {
    zoom: 1.5,
  }
  pan = { x: 0, y: 0.3 }
  isDragging = false;
  isPanning = false;
  previousMousePosition = { x: 0, y: 0 };

  constructor() {
    // Add event listener for trackpad scrolling to smoothly change zoom level
    document.addEventListener("wheel", (event) => {
      const canvas = document.getElementById("cal-vas");
      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;

      // const zoomSensitivity = 0.001 / (Math.min(canvasWidth, canvasHeight) / 500); // Adjust sensitivity based on canvas size
      // this.camera_pos.zoom *= 1 - event.deltaY * zoomSensitivity;

      // // Prevent zoom level from becoming too small or too large
      // this.camera_pos.zoom = Math.max(0.1, Math.min(100, this.camera_pos.zoom));

      this.pan.y += event.deltaY * 0.001;

      event.preventDefault();
    }, { passive: false });

    // Add event listener for mouse drag to rotate the sphere

    document.addEventListener("mousedown", (event) => {
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
      if (event.button === 0)
        this.isDragging = true;
      if (event.button === 2) // Right mouse button.
        this.isPanning = true;
    });

    document.addEventListener("mousemove", (event) => {
      if (this.isDragging) {
        // const canvas = document.getElementById("cal-vas");
        // const normalization_factor = canvas.clientWidth;

        // const deltaX = (event.clientX - this.previousMousePosition.x) / normalization_factor / this.camera_pos.zoom;
        // const deltaY = (event.clientY - this.previousMousePosition.y) / normalization_factor / this.camera_pos.zoom;

        // const scale = 50;
        // this.sphere_coords.theta_deg += deltaX * scale;
        // this.sphere_coords.phi_deg += deltaY * scale;

        // // Clamp phi_deg to avoid flipping
        // this.sphere_coords.phi_deg = Math.max(-89, Math.min(89, this.sphere_coords.phi_deg));
      }
      if (this.isPanning) {
        // const canvas = document.getElementById("cal-vas");
        // const normalization_factor = canvas.clientWidth;
        // const deltaX = (event.clientX - this.previousMousePosition.x) / this.camera_pos.zoom / normalization_factor
        // const deltaY = (event.clientY - this.previousMousePosition.y) / this.camera_pos.zoom / normalization_factor

        // const scale = 2;
        // this.pan.x += deltaX * scale;
        // this.pan.y -= deltaY * scale;
      }
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    });

    document.addEventListener("mouseup", (event) => {
      this.isDragging = false;
      if (event.button === 2) {
        this.isPanning = false;
      }
    });

    document.addEventListener("mouseleave", () => {
      this.isDragging = false;
    });

    document.addEventListener("contextmenu", (event) => {
      event.preventDefault(); // Prevent context menu
    });
  }
}



export { ViewControl }