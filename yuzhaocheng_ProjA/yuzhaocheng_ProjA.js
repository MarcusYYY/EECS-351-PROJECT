//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// RotatingTranslatedTriangle.js (c) 2012 matsuda
//
// jtRotatingTranslatedTriangle.js  MODIFIED for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin
//		(converted to 2D->4D; 3 verts --> 6 verts, 2 triangles arranged as long 
// 		(rectangle with small gap fills one single Vertex Buffer Object (VBO);
//		(draw same rectangle over and over, but with different matrix tranforms
//		(found from a tree of transformations to construct a jointed 'robot arm'
// SA
//	NormalRobotArm.js  (no change)

// Vertex shader program----------------------------------
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';
// Each instance computes all the on-screen attributes for just one VERTEX,
// specifying that vertex so that it can be used as part of a drawing primitive
// depicted in the CVV coord. system (+/-1, +/-1, +/-1) that fills our HTML5
// 'canvas' object.  The program gets all its info for that vertex through the
// 'attribute vec4' variable a_Position, which feeds it values for one vertex 
// taken from from the Vertex Buffer Object (VBO) we created inside the graphics
// hardware by calling the 'initVertexBuffers()' function.
//
//    ?What other vertex attributes can you set within a Vertex Shader? Color?
//    surface normal? texture coordinates?
//    ?How could you set each of these attributes separately for each vertex in
//    our VBO?  Could you store them in the VBO? Use them in the Vertex Shader?

// Fragment shader program----------------------------------
var FSHADER_SOURCE =
  //'#ifdef GL_ES\n' +
  'precision mediump float;\n' + 
  //'#endif\n' +
  'varying vec4 v_Color;\n' + 
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';
//  Each instance computes all the on-screen attributes for just one PIXEL.
// here we do the bare minimum: if we draw any part of any drawing primitive in 
// any pixel, we simply set that pixel to the constant color specified here.


// Global Variable -- Rotation angle rate (degrees/second)
var ANGLE_STEP = 45.0;
var ANGLE_STEP_1 = 45.0;
var floatsPerVertex = 7;
var isDrag=false;   // mouse-drag: true when user holds down mouse button
var xMclik=0.0;     // last mouse button-down position (in CVV coords)
var yMclik=0.0;   
var xMdragTot=0.0;  // total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0; 
var dist = Math.sqrt(xMdragTot*xMdragTot + yMdragTot*yMdragTot);
var movement = 0;



function main() {
//==============================================================================
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
    var n = initVertexBuffers(gl,currentAngle);
    if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  // Write the positions of vertices into an array, transfer
  // array contents to a Vertex Buffer Object created in the
  // graphics hardware.
  
  canvas.onmousedown  = function(ev){myMouseDown( ev, gl, canvas) };
  canvas.onmousemove =  function(ev){myMouseMove( ev, gl, canvas) };
  canvas.onmouseup =    function(ev){myMouseUp(   ev, gl, canvas)};

  window.addEventListener("keydown", myKeyDown, false);
  window.addEventListener("keyup", myKeyUp, false);
  window.addEventListener("keypress", myKeyPress, false);

  // Specify the color for clearing <canvas>
  gl.clearColor(0.3, 0.3, 0.3, 1);
  
  gl.enable(gl.DEPTH_TEST); 
  // Get storage location of u_ModelMatrix
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
	// Explain on console:
	console.log('\ndraw() fcn, line 151: translate1. rotate1. translate2.\n Draw box; Lower arm now complete.\n');
	console.log('Upper Arm, line 178: translate3. scale1. \n Draw box.\n');

  // Current rotation angle
  var currentAngle = 0.0;
  // Model matrix
  var modelMatrix = new Matrix4();
  var currentAngle_1 = 0.0;
  // Start drawing
  var tick = function() {

    currentAngle = animate(currentAngle); 
    currentAngle_1 = animate_1(currentAngle_1);
     // Update the rotation angle
    draw(gl, n, currentAngle_1,currentAngle, modelMatrix, u_ModelMatrix);   // Draw the triangle
    requestAnimationFrame(tick, canvas);   // Request that the browser ?calls tick
  };
  tick();
}

function initVertexBuffers(gl,currentAngle) {
//==============================================================================
  makebasic();
  makeSphere();
  makeCylinder();
  makeCylinder_1();
  
  

  var mySiz = (sphVerts.length + basic.length + cylVerts.length +cyl_1Verts.length);
  var n = mySiz / floatsPerVertex;   // The number of vertices
  var vertices = new Float32Array (mySiz);
  // Create a buffer object
  
  ba_start = 0;
  for(i = 0 ,j = 0; j < basic.length ;i++,j++){
    vertices[i] = basic[j];
  }
    sphStart = i;
    for(j = 0; j < sphVerts.length; i++,j++){
      vertices[i] = sphVerts[j];
    }
    cylStart = i;
    for(j = 0; j < cylVerts.length; i++,j++){
      vertices[i] = cylVerts[j];
    }
    cyl_1Start = i;
    for(j = 0; j < cyl_1Verts.length; i++,j++){
      vertices[i] = cyl_1Verts[j];
    }
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }
  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  var FSIZE = vertices.BYTES_PER_ELEMENT;

  // Assign the buffer object to a_Position variable
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 4, gl.FLOAT, false, FSIZE * 7, 0);
	// websearch yields OpenGL version: 
	//		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml
				//	glVertexAttributePointer (
				//			index == which attribute variable will we use?
				//			size == how many dimensions for this attribute: 1,2,3 or 4?
				//			type == what data type did we use for those numbers?
				//			isNormalized == are these fixed-point values that we need
				//						normalize before use? true or false
				//			stride == #bytes (of other, interleaved data) between OUR values?
				//			pointer == offset; how many (interleaved) values to skip to reach
				//					our first value?
				//				)
  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 7, FSIZE * 4);
  gl.enableVertexAttribArray(a_Color); 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return n;
}
function makeSphere() {

  var slices = 13;    
                      
  var sliceVerts  = 27; 
                      
  var topColr = new Float32Array([0.5, 0.0, 0.5]);  
  var equColr = new Float32Array([1.0, 1.0, 1.0]);  
  var botColr = new Float32Array([0.7, 0.7, 0.7]);  
  var sliceAngle = Math.PI/slices;  

  
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                   
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { 
    
    if(s==0) {
      isFirst = 1;  
      cos0 = 1.0;   
      sin0 = 0.0;
    }
    else {         
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    
    if(s==slices-1) isLast=1; 
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {        
        sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts)/10;  
        sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts)/10;  
        sphVerts[j+2] = cos0/10;   
        sphVerts[j+3] = 1.0;      
      }
      else {  
        sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts)/10;    
        sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts)/10;    
        sphVerts[j+2] = cos1/10;                                       
        sphVerts[j+3] = 1.0;                                           
      }
      if(s==0) {  
        sphVerts[j+4]=Math.random(); 
        sphVerts[j+5]=Math.random(); 
        sphVerts[j+6]=Math.random();
        }
      else if(s==slices-1) {
        sphVerts[j+4]=Math.random(); 
        sphVerts[j+5]=Math.random();
        sphVerts[j+6]=Math.random();
      }
      else if(s%2 == 0 && s != slices-1 && s!= 0){
          sphVerts[j+4]=Math.random(); 
          sphVerts[j+5]=Math.random();
          sphVerts[j+6]=Math.random();         
      }else{
          sphVerts[j+4]=Math.random();
          sphVerts[j+5]=Math.random();
          sphVerts[j+6]=Math.random();
      }
    }
  }
}
function makebasic(){
   c30 = Math.sqrt(0.75);          
   sq2 = Math.sqrt(2.0);
  var sq3 = Math.sqrt(3)/2*(-1);
    basic = new Float32Array ([

     0.0,   0.0, sq2/2, 1.0,      1.0,  1.0,  1.0,  // Node 0
     c30/2, -0.5/2, 0.0, 1.0,     0.5,  0.0,  0.5,  // Node 1
     0.0,  1.0/2, 0.0, 1.0,       0.5,  0.5,  0.0,  // Node 2
      // Face 1: (right side)
     0.0,  0.0, sq2/2, 1.0,       1.0,  1.0,  1.0,  // Node 0
     0.0,  1.0/2, 0.0, 1.0,       1.0,  0.0,  0.0,  // Node 2
    -c30/2, -0.5/2, 0.0, 1.0,     0.0,  1.0,  0.0,  // Node 3
      // Face 2: (lower side)
     0.0,  0.0, sq2/2, 1.0,       1.0,  1.0,  1.0,  // Node 0 
    -c30/2, -0.5/2, 0.0, 1.0,     0.0,  0.5,  0.5,  // Node 3
     c30/2, -0.5/2, 0.0, 1.0,     0.5,  0.0,  0.5,  // Node 1 
      // Face 3: (base side)  
    -c30/2, -0.5/2, -0.0, 1.0,    0.0,  0.5,  0.5,  // Node 3
     0.0,  1.0/2, -0.0, 1.0,      0.5,  0.5,  0.0,  // Node 2
     c30/2, -0.5/2, -0.0, 1.0,    0.0,  0.0,  1.0,
  ]);
}
function makeCylinder() {


 var ctrColr = new Float32Array([0.2, 0.2, 0.2]); // dark gray
 var topColr = new Float32Array([0.4, 0.7, 0.4]); // light green
 var botColr = new Float32Array([0.5, 0.5, 1.0]); // light blue
 var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
 var botRadius = 0.0;   // radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 cylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 

  // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
  // v counts vertices: j counts array elements (vertices * elements per vertex)
  for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of cylinder's top cap:
      cylVerts[j  ] = 0.0;      // x,y,z,w == 0,0,1,1
      cylVerts[j+1] = 0.0;  
      cylVerts[j+2] = 1.0; 
      cylVerts[j+3] = 1.0;      // r,g,b = topColr[]
      cylVerts[j+4]=Math.random(); 
      cylVerts[j+5]=Math.random(); 
      cylVerts[j+6]=Math.random();
    }
    else {  // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
      cylVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);     // x
      cylVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);     // y
      //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
      //   can simplify cos(2*PI * (v-1)/(2*capVerts))
      cylVerts[j+2] = 1.0;  // z
      cylVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      cylVerts[j+4]=Math.random(); 
      cylVerts[j+5]=Math.random(); 
      cylVerts[j+6]=Math.random();     
    }
  }
  // Create the cylinder side walls, made of 2*capVerts vertices.
  // v counts vertices within the wall; j continues to count array elements
  for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
    if(v%2==0)  // position all even# vertices along top cap:
    {   
        cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);   // x
        cylVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);   // y
        cylVerts[j+2] = 1.0;  // z
        cylVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        cylVerts[j+4]=Math.random(); 
        cylVerts[j+5]=Math.random(); 
        cylVerts[j+6]=Math.random();     
    }
    else    // position all odd# vertices along the bottom cap:
    {
        cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        cylVerts[j+2] =-1.0;  // z
        cylVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        cylVerts[j+4]=Math.random(); 
        cylVerts[j+5]=Math.random(); 
        cylVerts[j+6]=Math.random();     
    }
  }
  // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
  // v counts the vertices in the cap; j continues to count array elements
  for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
    if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
      cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x
      cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
      cylVerts[j+2] =-1.0;  // z
      cylVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      cylVerts[j+4]=Math.random(); 
      cylVerts[j+5]=Math.random(); 
      cylVerts[j+6]=Math.random();   
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      cylVerts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
      cylVerts[j+1] = 0.0;  
      cylVerts[j+2] =-1.0; 
      cylVerts[j+3] = 1.0;      // r,g,b = botColr[]
      cylVerts[j+4]=Math.random(); 
      cylVerts[j+5]=Math.random(); 
      cylVerts[j+6]=Math.random();
    }
  }
}
function makeCylinder_1() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var ctrColr = new Float32Array([0.3, 0.3, 0.9]); // dark gray
 var topColr = new Float32Array([0.3,0.6,0.3]); // light green
 var botColr = new Float32Array([0.3,0.3,0.9]); // light blue
 var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
 var botRadius = 1.0;   // radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 cyl_1Verts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 

  // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
  // v counts vertices: j counts array elements (vertices * elements per vertex)
  for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of cylinder's top cap:
      cyl_1Verts[j  ] = 0.0;      // x,y,z,w == 0,0,1,1
      cyl_1Verts[j+1] = 0.0;  
      cyl_1Verts[j+2] = 1.0; 
      cyl_1Verts[j+3] = 1.0;      // r,g,b = topColr[]
      cyl_1Verts[j+4]=ctrColr[0];  
      cyl_1Verts[j+5]=ctrColr[1]; 
      cyl_1Verts[j+6]=ctrColr[2]; 
    }
    else {  // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
      cyl_1Verts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);     // x
      cyl_1Verts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);     // y
      //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
      //   can simplify cos(2*PI * (v-1)/(2*capVerts))
      cyl_1Verts[j+2] = 1.0;  // z
      cyl_1Verts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      cyl_1Verts[j+4]=topColr[0]; 
      cyl_1Verts[j+5]=topColr[1]; 
      cyl_1Verts[j+6]=topColr[2];   
    }
  }
  // Create the cylinder side walls, made of 2*capVerts vertices.
  // v counts vertices within the wall; j continues to count array elements
  for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
    if(v%2==0)  // position all even# vertices along top cap:
    {   
        cyl_1Verts[j  ] = Math.cos(Math.PI*(v)/capVerts);   // x
        cyl_1Verts[j+1] = Math.sin(Math.PI*(v)/capVerts);   // y
        cyl_1Verts[j+2] = 1.0;  // z
        cyl_1Verts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        cyl_1Verts[j+4]=topColr[0]; 
        cyl_1Verts[j+5]=topColr[1];
        cyl_1Verts[j+6]=topColr[2];    
    }
    else    // position all odd# vertices along the bottom cap:
    {
        cyl_1Verts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        cyl_1Verts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        cyl_1Verts[j+2] =-1.0;  // z
        cyl_1Verts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        cyl_1Verts[j+4]=botColr[0];  
        cyl_1Verts[j+5]=botColr[1];  
        cyl_1Verts[j+6]=botColr[2];      
    }
  }
  // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
  // v counts the vertices in the cap; j continues to count array elements
  for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
    if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
      cyl_1Verts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x
      cyl_1Verts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
      cyl_1Verts[j+2] =-1.0;  // z
      cyl_1Verts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      cyl_1Verts[j+4]=ctrColr[0]; 
      cyl_1Verts[j+5]=ctrColr[1];
      cyl_1Verts[j+6]=ctrColr[2];
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      cyl_1Verts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
      cyl_1Verts[j+1] = 0.0;  
      cyl_1Verts[j+2] =-1.0; 
      cyl_1Verts[j+3] = 1.0;      // r,g,b = botColr[]
      cyl_1Verts[j+4]=topColr[0]; 
      cyl_1Verts[j+5]=topColr[1]; 
      cyl_1Verts[j+6]=topColr[2];
    }
  }
}



function draw(gl, n, currentAngle_1, currentAngle, modelMatrix, u_ModelMatrix) {
//==============================================================================
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
   //cylinder 1
   modelMatrix.setTranslate(0,-0.8,0);
   modelMatrix.scale(0.1,0.1,0.1);
   modelMatrix.rotate(90,1.0,0.0,0.0);
   modelMatrix.rotate(currentAngle_1,0,1,0);
   modelMatrix.rotate(currentAngle*3,0,0,1);
   gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
   gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                cylStart/floatsPerVertex, // start at this vertex number, and 
                cylVerts.length/floatsPerVertex);
   
   pushMatrix(modelMatrix);
   pushMatrix(modelMatrix);
   //sphere 1
   modelMatrix.setTranslate(0,-0.8,0);
   modelMatrix.rotate(currentAngle_1,0,0,1)
   modelMatrix.translate(0,0.2,0);
   modelMatrix.rotate(currentAngle*3,1,1,1);
   gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
   gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                sphStart/floatsPerVertex, // start at this vertex number, and 
                sphVerts.length/floatsPerVertex);
   //cylinder 2
   modelMatrix = popMatrix(); 
   modelMatrix.translate(0,0,-4);
   modelMatrix.rotate(currentAngle_1*0,0,1,0);
   gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
   gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                cylStart/floatsPerVertex, // start at this vertex number, and 
                cylVerts.length/floatsPerVertex);

  //sphere 2
   modelMatrix.setTranslate(0,-0.8,0);
   modelMatrix.rotate(currentAngle_1,0,0,1)
   modelMatrix.translate(0,0.6,0);
   modelMatrix.rotate(currentAngle*3,1,1,1)
   gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
   gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                sphStart/floatsPerVertex, // start at this vertex number, and 
                sphVerts.length/floatsPerVertex);

   //basic
    modelMatrix.setTranslate(0.0,-0.8, 0.0);
    modelMatrix.scale(0.5,0.5,0.5); 
    modelMatrix.rotate(currentAngle_1, 0, 0, 1);
    modelMatrix.translate(0.0,1.9,0);
    modelMatrix.rotate(currentAngle*3,0,1,0);
    modelMatrix.rotate(60, 0, 0, 1);
    modelMatrix.scale(yMdragTot+1,yMdragTot+1,yMdragTot+1);
    //modelMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex 0...
    gl.drawArrays(gl.TRIANGLES, 
                           0,  // start at this vertex number, and 
                           12);
  modelMatrix.scale(-1,-1,-1); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex 0...
  gl.drawArrays(gl.TRIANGLES, 
                           0,  // start at this vertex number, and 
                           12);
  pushMatrix(modelMatrix);
  pushMatrix(modelMatrix);

  modelMatrix.translate(0.0,0.5, 0.0);  // 'set' means DISCARD old matrix,
              // (drawing axes centered in CVV), and then make new
              // drawing axes moved to the lower-left corner of CVV. 
           // convert to left-handed coord sys
  modelMatrix.rotate(currentAngle_1, 0, 0, 1);
  
  modelMatrix.scale(0.5,0.5,-0.5);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex 0...
  gl.drawArrays(gl.TRIANGLES, 
                           0,  // start at this vertex number, and 
                           12);
  modelMatrix.translate(0.0,0.5, 0.0);  // 'set' means DISCARD old matrix,
              // (drawing axes centered in CVV), and then make new
              // drawing axes moved to the lower-left corner of CVV. 
           // convert to left-handed coord sys
  modelMatrix.rotate(currentAngle_1, 0, 0, 1);
  
  modelMatrix.scale(0.8,0.8,-0.8);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex 0...
  gl.drawArrays(gl.TRIANGLES, 
                           0,  // start at this vertex number, and 
                           12);

  modelMatrix.translate(0.0,0.5, 0.0);
  modelMatrix.rotate(currentAngle_1, 0, 0, 1);
  
  modelMatrix.scale(0.8,0.8,-0.8);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex 0...
  gl.drawArrays(gl.TRIANGLES, 
                           0,  // start at this vertex number, and 
                           12);

  //push
  modelMatrix = popMatrix();
  modelMatrix.translate(-c30/2, -0.5/2, 0.0);  // 'set' means DISCARD old matrix,
              // (drawing axes centered in CVV), and then make new
              // drawing axes moved to the lower-left corner of CVV. 
           // convert to left-handed coord sys
  modelMatrix.rotate(currentAngle_1, 0, 0, 1);
  
  modelMatrix.scale(0.5,0.5,-0.5);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex 0...
  gl.drawArrays(gl.TRIANGLES, 
                           0,  // start at this vertex number, and 
                           12);
  modelMatrix.translate(-c30/2, -0.5/2, 0.0);  // 'set' means DISCARD old matrix,
              // (drawing axes centered in CVV), and then make new
              // drawing axes moved to the lower-left corner of CVV. 
           // convert to left-handed coord sys
  modelMatrix.rotate(currentAngle_1, 0, 0, 1);
  
  modelMatrix.scale(0.8,0.8,-0.8);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex 0...
  gl.drawArrays(gl.TRIANGLES, 
                           0,  // start at this vertex number, and 
                           12);
  modelMatrix.translate(-c30/2, -0.5/2, 0.0);  // 'set' means DISCARD old matrix,
              // (drawing axes centered in CVV), and then make new
              // drawing axes moved to the lower-left corner of CVV. 
           // convert to left-handed coord sys
  modelMatrix.rotate(currentAngle_1, 0, 0, 1);
  
  modelMatrix.scale(0.8,0.8,-0.8);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex 0...
  gl.drawArrays(gl.TRIANGLES, 
                           0,  // start at this vertex number, and 
                           12);


   

  modelMatrix = popMatrix();
  modelMatrix.translate(c30/2, -0.5/2, 0.0);
  modelMatrix.rotate(currentAngle_1, 0, 0, 1);
  
  modelMatrix.scale(0.5,0.5,-0.5);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex 0...
  gl.drawArrays(gl.TRIANGLES, 
                           0,  // start at this vertex number, and 
                           12);
  modelMatrix.translate(c30/2, -0.5/2, 0.0);
  modelMatrix.rotate(currentAngle_1, 0, 0, 1);
  
  modelMatrix.scale(0.8,0.8,-0.8);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex 0...
  gl.drawArrays(gl.TRIANGLES, 
                           0,  // start at this vertex number, and 
                           12);
  modelMatrix.translate(c30/2, -0.5/2, 0.0);
  modelMatrix.rotate(currentAngle_1, 0, 0, 1);
  
  modelMatrix.scale(0.8,0.8,-0.8);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex 0...
  gl.drawArrays(gl.TRIANGLES, 
                           0,  // start at this vertex number, and 
                           12);
  
  modelMatrix.setRotate(currentAngle*3,0,1, 0);
  modelMatrix.translate(Math.abs(0.18-currentAngle/1000)*3+0.4,Math.abs(0.18-currentAngle/1000)*10-0.8, 0);
  modelMatrix.scale(xMdragTot+0.0001,xMdragTot+0.0001,xMdragTot+0.0001);
  modelMatrix.translate(movement,movement,0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                sphStart/floatsPerVertex, // start at this vertex number, and 
                sphVerts.length/floatsPerVertex);


  modelMatrix.setRotate(currentAngle*3,0, 1, 0);
  modelMatrix.translate(-Math.abs(0.18-currentAngle/1000)*3-0.4,Math.abs(0.18-currentAngle/1000)*10-0.8, 0);
  modelMatrix.scale(xMdragTot+0.0001, xMdragTot+0.0001, xMdragTot+0.0001);
  modelMatrix.translate(-movement,movement,0);
 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                sphStart/floatsPerVertex, // start at this vertex number, and 
                sphVerts.length/floatsPerVertex);
  pushMatrix(modelMatrix);

  //back
   modelMatrix.setScale(2,2,0.001);
   modelMatrix.translate(0,0,1000);
   modelMatrix.rotate(currentAngle,0.0,0.0, 1.0);
   gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
   gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                cyl_1Start/floatsPerVertex, // start at this vertex number, and 
                cyl_1Verts.length/floatsPerVertex);

}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();
var g_ll = Date.now();
function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
  
  
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}
function animate_1(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_ll;
  g_ll = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
  
  if(angle >   30.0 && ANGLE_STEP_1 > 0) ANGLE_STEP_1 = -ANGLE_STEP_1;
  if(angle <  -30.0 && ANGLE_STEP_1 < 0) ANGLE_STEP_1 = -ANGLE_STEP_1;
  var newAngle = angle + (ANGLE_STEP_1 * elapsed) / 1000.0;
  return newAngle %= 360;
}
function moreCCW() {
//==============================================================================

  ANGLE_STEP += 10;
  ANGLE_STEP_1 += 10; 
  
}

function lessCCW() {
//==============================================================================
  ANGLE_STEP -= 10;
  ANGLE_STEP_1 -= 10;
 
}
function runStop() {
  if(ANGLE_STEP*ANGLE_STEP > 1) {
    myTmp = ANGLE_STEP;
    myTmp_1 = ANGLE_STEP_1;
    ANGLE_STEP = 0;
    ANGLE_STEP_1 = 0
  }
  else {
    ANGLE_STEP = myTmp;
    ANGLE_STEP_1 = myTmp_1;
  }
}
function myMouseDown(ev, gl, canvas) {
  var rect = ev.target.getBoundingClientRect();
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top);
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
//  console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
  
  isDrag = true;                      // set our mouse-dragging flag
  xMclik = x;                         // record where mouse-dragging began
  yMclik = y;
};
function myMouseMove(ev, gl, canvas) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
//                  (Which button?   console.log('ev.button='+ev.button);    )
//    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

  if(isDrag==false) return;       // IGNORE all mouse-moves except 'dragging'

  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
//  console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);

  // find how far we dragged the mouse:
  xMdragTot += (x - xMclik);          // Accumulate change-in-mouse-position,&
  yMdragTot += (y - yMclik);
  xMclik = x;                         // Make next drag-measurement from here.
  yMclik = y;
};
function myMouseUp(ev, gl, canvas) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
//                  (Which button?   console.log('ev.button='+ev.button);    )
//    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
  console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
  
  isDrag = false;                     // CLEAR our mouse-dragging flag, and
  // accumulate any final bit of mouse-dragging we did:
  xMdragTot += (x - xMclik);
  yMdragTot += (y - yMclik);
  console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);
};
function myKeyDown(ev) {
//===============================================================================
// Called when user presses down ANY key on the keyboard, and captures the 
// keyboard's scancode or keycode(varies for different countries and alphabets).
//  CAUTION: You may wish to avoid 'keydown' and 'keyup' events: if you DON'T 
// need to sense non-ASCII keys (arrow keys, function keys, pgUp, pgDn, Ins, 
// Del, etc), then just use the 'keypress' event instead.
//   The 'keypress' event captures the combined effects of alphanumeric keys and // the SHIFT, ALT, and CTRL modifiers.  It translates pressed keys into ordinary
// ASCII codes; you'll get the ASCII code for uppercase 'S' if you hold shift 
// and press the 's' key.
// For a light, easy explanation of keyboard events in JavaScript,
// see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
// For a thorough explanation of the messy way JavaScript handles keyboard events
// see:    http://javascript.info/tutorial/keyboard-events
//

  switch(ev.keyCode) {      // keycodes !=ASCII, but are very consistent for 
  //  nearly all non-alphanumeric keys for nearly all keyboards in all countries.
    case 37:    // left-arrow key
      // print in console:
      console.log('   left-arrow.');
      document.getElementById('Result').innerHTML =
      '   Left Arrow:ANGLE_STEP UP';
      ANGLE_STEP += 10;
      break;
    case 38:    // up-arrow key
      console.log('   up-arrow.');
      document.getElementById('Result').innerHTML =
        '  Up Arrow: movement for the orbiting spheres.';
       movement += 0.2;
      break;
    case 39:    // right-arrow key
      console.log('right-arrow.');
      ANGLE_STEP -= 10;
      document.getElementById('Result').innerHTML =
        'Right Arrow:ANGLE_STEP DOWN'
      break;
    case 40:    // down-arrow key
      movement -= 0.2;
      console.log(' down-arrow.');
      document.getElementById('Result').innerHTML =
        ' Down Arrow:movement for the orbiting spheres.';
      break;
    default:
      console.log('myKeyDown()--keycode=', ev.keyCode, ', charCode=', ev.charCode);
      document.getElementById('Result').innerHTML =
        'You can drag your mouse and press the direction key';
      break;
  }
}

function myKeyUp(ev) {
//===============================================================================
// Called when user releases ANY key on the keyboard; captures scancodes well
  
  console.log('myKeyUp()--keyCode='+ev.keyCode+' released.');
}

function myKeyPress(ev) {
//===============================================================================
// Best for capturing alphanumeric keys and key-combinations such as 
// CTRL-C, alt-F, SHIFT-4, etc.
  console.log('myKeyPress():keyCode='+ANGLE_STEP_1 +', charCode=' +ev.charCode+
                        ', shift='    +ev.shiftKey + ', ctrl='    +ev.ctrlKey +
                        ', altKey='   +ev.altKey   +
                        ', metaKey(Command key or Windows key)='+ev.metaKey);
}

