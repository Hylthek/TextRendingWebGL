class ViewControl {
  sphere_coords = {
    theta_deg: 0,
    phi_deg: 0
  }
  camera_pos = {
    zoom: 1.5,
  }
  pan = { x: 0, y: 0 }
  is_panning = false;
  is_rotating = false;
  previousMousePosition = { x: 0, y: 0 };

  constructor() {
    // Add event listener for trackpad scrolling to smoothly change zoom level
    document.addEventListener("wheel", (event) => {
      const canvas = document.getElementById("cal-vas");
      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;

      // Prevent zoom level from becoming too small or too large
      const min_zoom = 0.0001;
      const max_zoom = 1000;
      const zoom_maxed = this.camera_pos.zoom > max_zoom;
      const zoom_mined = this.camera_pos.zoom < min_zoom;

      // Change zoom.
      const empirical_zoom_scalar = 0.002;
      const zoomSensitivity = 0.003 / (Math.min(canvasWidth, canvasHeight) * empirical_zoom_scalar);
      const is_zooming_out = event.deltaY > 0
      const dont_change_zoom = zoom_mined && is_zooming_out || zoom_maxed && !is_zooming_out;
      if (!dont_change_zoom)
        this.camera_pos.zoom *= 1 - event.deltaY * zoomSensitivity;

      // Alter pan to make scene zoom in at cursor
      // Only if zoom isn't limited.
      const rect = canvas.getBoundingClientRect();
      const cursorX = (event.clientX - rect.left) / canvasWidth * 2 - 1;
      const cursorY = -((event.clientY - rect.top) / canvasHeight * 2 - 1);
      const y_zoompan_scale_empirical = 0.56;
      if (!dont_change_zoom) {
        this.pan.x += cursorX * event.deltaY * zoomSensitivity / this.camera_pos.zoom;
        this.pan.y += cursorY * event.deltaY * zoomSensitivity / this.camera_pos.zoom * y_zoompan_scale_empirical;
      }

      event.preventDefault();
    }, { passive: false });

    // Add event listener for mouse drag to rotate the sphere
    document.addEventListener("mousedown", (event) => {
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
      if (event.button === 0)
        this.is_panning = true;
      if (event.button === 2) // Right mouse button.
        this.is_rotating = true;
    });

    document.addEventListener("mousemove", (event) => {
      if (this.is_panning) {
        const canvas = document.getElementById("cal-vas");
        const normalization_factor = canvas.clientWidth;
        const deltaX = (event.clientX - this.previousMousePosition.x) / this.camera_pos.zoom / normalization_factor
        const deltaY = (event.clientY - this.previousMousePosition.y) / this.camera_pos.zoom / normalization_factor

        const scale = 2;
        this.pan.x += deltaX * scale;
        this.pan.y -= deltaY * scale;
      }
      if (this.is_rotating) {
        const canvas = document.getElementById("cal-vas");
        const normalization_factor = canvas.clientWidth;

        const deltaX = (event.clientX - this.previousMousePosition.x) / normalization_factor / this.camera_pos.zoom;
        const deltaY = (event.clientY - this.previousMousePosition.y) / normalization_factor / this.camera_pos.zoom;

        const scale = 50;
        this.sphere_coords.theta_deg += deltaX * scale;
        this.sphere_coords.phi_deg += deltaY * scale;

        // Clamp phi_deg to avoid flipping
        this.sphere_coords.phi_deg = Math.max(-89, Math.min(89, this.sphere_coords.phi_deg));
      }
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    });

    document.addEventListener("mouseup", (event) => {
      this.is_panning = false;
      if (event.button === 2) {
        this.is_rotating = false;
      }
    });

    document.addEventListener("mouseleave", () => {
      this.is_panning = false;
    });

    document.addEventListener("contextmenu", (event) => {
      event.preventDefault(); // Prevent context menu
    });
  }
}



export { ViewControl }