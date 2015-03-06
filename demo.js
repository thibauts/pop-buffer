var shell = require('gl-now')();
var bunny = require('bunny');
var normals = require('normals');
var createGeometry = require('gl-geometry');
var createShader = require('gl-shader');
var mat4 = require('gl-matrix').mat4;

var encode = require('./').encode;
var decode = require('./').decode;

var popBuffer = encode(bunny.cells, bunny.positions, 16);

var geom, shader, start, level = 0;

var vertexShader = '                                \
attribute vec3 position;                            \
attribute vec3 normal ;                             \
uniform mat4 mv;                                    \
uniform mat4 proj;                                  \
varying vec3 v_normal;                              \
varying vec3 v_position;                            \
                                                    \
void main() {                                       \
  gl_Position = proj * mv * vec4(position, 1.0);    \
  v_normal = vec3(mv * vec4(normal, 0.0));          \
  v_position = vec3(mv * vec4(position, 1.0));      \
}                                                   \
'
var fragmentShader = '                              \
precision mediump float;                            \
uniform vec3 ambient;                               \
uniform vec3 diffuse;                               \
varying vec3 v_normal;                              \
varying vec3 v_position;                            \
                                                    \
void main() {                                       \
  vec3 N = normalize(v_normal);                     \
  vec3 E = normalize(- v_position);                 \
  float f = max(dot(N, E), 0.0);                    \
  gl_FragColor = vec4(ambient + diffuse * f, 1.0);  \
}                                                   \
';

shell.on('gl-init', function() {
  shell.gl.enable(shell.gl.DEPTH_TEST);
  shell.gl.enable(shell.gl.CULL_FACE)

  bunny.normals = normals.vertexNormals(bunny.cells, bunny.positions);
  geom = createGeometry(shell.gl);

  shader = createShader(shell.gl, vertexShader, fragmentShader);

  start = performance.now();
});

shell.on('gl-render', function() {
  var t = performance.now() - start;
  shader.bind();

  var proj = mat4.create();
  mat4.perspective(proj, Math.PI / 4, shell.width / shell.height, 0.1, 1000);

  var mv = mat4.create();
  mat4.lookAt(mv, [0, 0, 20], [0, 4, 0], [0, 1, 0]);
  mat4.rotateX(mv, mv, Math.PI / 8);
  mat4.rotateY(mv, mv, 2 * Math.PI * (t / 1000) / 10 * -1);

  // cycle through levels every second / 2
  var curLevel = parseInt(t / 1000 * 2) % 16 + 1;

  if(curLevel !== level) {
    level = curLevel;

    console.log('rendering level', level);

    // slice "level" levels from the pop buffer
    var pb = {
      bounds: popBuffer.bounds,
      levels: popBuffer.levels.slice(0, level)
    };

    var mesh = decode(pb);
    mesh.normals = normals.vertexNormals(mesh.cells, mesh.positions);

    geom.dispose();
    geom = createGeometry(shell.gl)
      .attr('position', mesh.positions)
      .attr('normal', mesh.normals)
      .faces(mesh.cells);
  }

  geom.bind(shader);

  shader.uniforms.proj = proj;
  shader.uniforms.mv = mv;
  shader.uniforms.ambient = [0.5, 0.5, 0.5];
  shader.uniforms.diffuse = [0.5, 0.5, 0.5];

  geom.draw();
});
