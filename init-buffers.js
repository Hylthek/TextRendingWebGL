function initBuffers(gl) {
    const positionBuffer = initPositionBuffer(gl);

    const textureCoordBuffer = initTextureBuffer(gl);

    const indexBuffer = initIndexBuffer(gl);

    return {
        position: positionBuffer,
        textureCoord: textureCoordBuffer,
        indices: indexBuffer,
    };
}

function initPositionBuffer(gl) {
    // Create a buffer for the square's positions.
    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const gross_scale = 0.7
    const base_2 = 1.6 / 2 * gross_scale
    const width_2 = 1.6 / 2 * gross_scale
    const height_2 = 0.9 / 2 * gross_scale

    // Now create an array of positions for the cube.
    const positions = [
        // Front face
        -width_2, -height_2, base_2, width_2, -height_2, base_2, width_2, height_2, base_2, -width_2, height_2, base_2,

        // Back face
        -width_2, -height_2, -base_2, -width_2, height_2, -base_2, width_2, height_2, -base_2, width_2, -height_2, -base_2,

        // Top face
        -width_2, height_2, -base_2, -width_2, height_2, base_2, width_2, height_2, base_2, width_2, height_2, -base_2,

        // Bottom face
        -width_2, -height_2, -base_2, width_2, -height_2, -base_2, width_2, -height_2, base_2, -width_2, -height_2, base_2,

        // Right face
        width_2, -height_2, -base_2, width_2, height_2, -base_2, width_2, height_2, base_2, width_2, -height_2, base_2,

        // Left face
        -width_2, -height_2, -base_2, -width_2, -height_2, base_2, -width_2, height_2, base_2, -width_2, height_2, -base_2,
    ];

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return positionBuffer;
}

function initColorBuffer(gl) {
    const faceColors = [
        [0, 1, 0, 1.0], // Front face: green
        [0, 0, 1, 1.0], // Back face: blue
        [1, 1, 1, 1.0], // Top face: white
        [1, 1, 0, 1.0], // Bottom face: yellow
        [1, 0, 0, 1.0], // Right face: red
        [1, 0.5, 0, 1.0], // Left face: orange
    ];

    // Convert the array of colors into a table for all the vertices.

    let colors = [];

    for (const c of faceColors) {
        // Repeat each color four times for the four vertices of the face
        colors = colors.concat(c, c, c, c);
    }

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return colorBuffer;
}

function initIndexBuffer(gl) {
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.

    // prettier-ignore
    const indices = [
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // back
        8, 9, 10, 8, 10, 11,   // top
        12, 13, 14, 12, 14, 15,   // bottom
        16, 17, 18, 16, 18, 19,   // right
        20, 21, 22, 20, 22, 23,   // left
    ];

    // Now send the element array to GL

    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices),
        gl.STATIC_DRAW,
    );

    return indexBuffer;
}

function initTextureBuffer(gl) {
    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

    const textureCoordinates = [ // Rotated to hardcode correct texture rotation.
        // Front
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, // 180deg
        // Back
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, // 90deg CCW
        // Top
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, // None
        // Bottom
        1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, // 90deg CW
        // Right
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, // 90deg CCW
        // Left
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, // 180deg
    ];

    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(textureCoordinates),
        gl.STATIC_DRAW,
    );

    return textureCoordBuffer;
}

export { initBuffers };