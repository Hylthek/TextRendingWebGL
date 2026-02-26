export class VertexAttributeHandler {
  /**
   * 
   * @param {WebGL2RenderingContext} gl 
   */
  constructor(gl) {
    this.gl = gl;
  }

  /**@type {Boolean} */
  is_inited = false;
  /**@type {Number} */
  num_vertices;
  /**@type {Number} */
  num_triangles;
  /**@type {Number} */
  max_num_vertices;
  /**@type {Number} */
  max_num_triangles;

  /**@type {Float32Array} */
  js_positions_buffer;
  /**@type {Uint16Array} */
  js_indices_buffer;
  /** An object that takes in keys: (num_components, attribute name) and spits out values: Float32Array */
  js_misc_attrib_buffers = {
    1: {},
    2: {},
    3: {},
    4: {},
  }

  /**@type {WebGLBuffer} */
  gl_positions_buffer;
  /**@type {WebGLBuffer} */
  gl_indices_buffer;
  /** An object that takes in keys: (num_components, attribute name) and values: WebGLBuffer */
  gl_misc_attrib_buffers = {
    1: {},
    2: {},
    3: {},
    4: {},
  }

  InitBuffers(max_num_points, max_num_triangles) {
    this.is_inited = true;
    this.max_num_vertices = max_num_points;
    this.max_num_triangles = max_num_triangles

    this.num_vertices = 0;
    this.num_triangles = 0;

    this.js_positions_buffer = new Float32Array(3 * max_num_points)
    this.js_indices_buffer = new Uint16Array(3 * max_num_triangles)

    this.gl_positions_buffer = this.gl.createBuffer()
    this.gl_indices_buffer = this.gl.createBuffer()

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl_positions_buffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(max_num_points * 3), this.gl.STATIC_DRAW)

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.gl_indices_buffer)
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Float32Array(max_num_triangles * 3), this.gl.STATIC_DRAW)
  }

  /**
   * Adds a specified point's coords to a js and a gl buffer.
   * @param {Object} point_position 
   */
  AddPosition(point_position) {
    if (point_position?.x === undefined || point_position?.y === undefined || point_position?.z === undefined)
      throw new Error("point isn't an object with x, y, and z defined.")
    if (!this.is_inited)
      throw new Error("GL array buffers haven't been initialized yet.")
    if (this.num_vertices >= this.max_num_vertices)
      throw new Error("Max size of gl array buffer reached, reinitialize with InitBuffer().")

    // Add coords to js array.
    this.js_positions_buffer[3 * this.num_vertices + 0] = point_position.x;
    this.js_positions_buffer[3 * this.num_vertices + 1] = point_position.y;
    this.js_positions_buffer[3 * this.num_vertices + 2] = point_position.z;

    this.num_vertices++;

    // Add coords to gl array.
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl_positions_buffer)
    const typed_positions_buffer = this.js_positions_buffer.slice(this.num_vertices * 3 - 3, this.num_vertices * 3);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 4 * (this.num_vertices - 1) * 3, typed_positions_buffer)
  }

  /**
   * Adds a triplet of indices of the previous three vertex positions to the indices js/gl buffers.
   */
  AddTriangle() {
    if (this.num_triangles >= this.max_num_triangles)
      throw new Error("Max size of gl element array buffer reached, reinitialize with InitBuffer().");
    if (!this.is_inited)
      throw new Error("Buffers aren't initialized yet.");
    if (this.num_vertices < 3)
      throw new Error("Aren't enough points to create triangle.");

    // Add triplet to js array.
    this.js_indices_buffer[3 * this.num_triangles + 0] = this.num_vertices - 3;
    this.js_indices_buffer[3 * this.num_triangles + 1] = this.num_vertices - 2;
    this.js_indices_buffer[3 * this.num_triangles + 2] = this.num_vertices - 1;
    this.num_triangles++;

    // Add triplet to gl element array buffer.
    // Add coords to gl array.
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.gl_indices_buffer);
    const typed_indices_buffer = this.js_indices_buffer.slice(this.num_triangles * 3 - 3, this.num_triangles * 3);
    this.gl.bufferSubData(this.gl.ELEMENT_ARRAY_BUFFER, 2 * (this.num_triangles - 1) * 3, typed_indices_buffer);
  }

  /**
   * 
   * @param {String} name 
   * @param {GLint} shader_attrib_location The value returned by gl.getAttribLocation()
   */
  LoadPositionAttrib(shader_attrib_location) {
    if (shader_attrib_location === undefined)
      throw new Error("shader attribute location is undefined.")

    // Load vertex positions.
    const num_components = 3; // pull out 3 values per vertex.
    const type = this.gl.FLOAT;
    const normalize = false;
    const stride = 0; // How many bytes to get from one set of values to the next. 0 = closed spacing.
    const offset = 0; // How many bytes inside the buffer to start from
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl_positions_buffer);
    this.gl.vertexAttribPointer(
      shader_attrib_location,
      num_components,
      type,
      normalize,
      stride,
      offset,
    );
    this.gl.enableVertexAttribArray(shader_attrib_location);
  }

  /**
   * Initializes a new vertex attribute for general usage.
   * @param {String} name 
   */
  InitMiscAttrib(name, num_components) {
    if (!this.is_inited)
      throw new Error("Buffers ren't initialized yet.");
    if (num_components < 1 || num_components > 4)
      throw new Error("num_components has to be 1,2,3,4")

    // Get active references by number of components.
    const active_js_misc_attrib_buffers = this.js_misc_attrib_buffers[num_components];
    const active_gl_misc_attrib_buffers = this.gl_misc_attrib_buffers[num_components];

    if (active_gl_misc_attrib_buffers[name] !== undefined)
      console.warn("Misc attribute buffer is being overwritten.");

    active_js_misc_attrib_buffers[name] = new Float32Array(num_components * this.max_num_vertices)

    active_gl_misc_attrib_buffers[name] = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, active_gl_misc_attrib_buffers[name])
    this.gl.bufferData(this.gl.ARRAY_BUFFER, 4 * this.max_num_vertices * num_components, this.gl.STATIC_DRAW)
  }

  /**
   * Alters the attribute of the most recently added vertex.
   * @param {String} name 
   * @param {Array<Number>} values
   */
  AddMiscAttrib(name, values) {
    if (!this.is_inited)
      throw new Error("GL array buffers haven't been initialized yet.")
    if (this.num_vertices < 1)
      throw new Error("No previously added vertex exists.")
    if (values.length < 1 || values.length > 4)
      throw new Error("values.length has to be 1,2,3,or4")

    const num_components = values.length;

    if (this.js_misc_attrib_buffers[num_components][name] === undefined)
      throw new Error("Buffer of 'name' isn't initialized yet.")

    const prev_attribute_buffer_idx = (this.num_vertices - 1) * num_components;
    const active_js_attribute_buffer = this.js_misc_attrib_buffers[num_components][name];
    const active_gl_attribute_buffer = this.gl_misc_attrib_buffers[num_components][name];

    // Add value to js array.
    for (let i = 0; i < num_components; i++) 
      active_js_attribute_buffer[prev_attribute_buffer_idx + i] = values[i];
    
    // Add value to gl array.
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, active_gl_attribute_buffer);
    const typed_values_buffer = new Float32Array(values);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 4 * prev_attribute_buffer_idx, typed_values_buffer);
  }

  /**
   * 
   * @param {String} name 
   * @param {GLint} shader_attrib_location 
   */
  LoadMiscAttrib(name, num_components, shader_attrib_location) {
    if (this.gl_misc_attrib_buffers[num_components][name] === undefined)
      throw new Error("Misc attribute isn't initialized yet.")

    const type = this.gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl_misc_attrib_buffers[num_components][name]);
    this.gl.vertexAttribPointer(
      shader_attrib_location,
      num_components,
      type,
      normalize,
      stride,
      offset,
    );
    this.gl.enableVertexAttribArray(shader_attrib_location);
  }
}