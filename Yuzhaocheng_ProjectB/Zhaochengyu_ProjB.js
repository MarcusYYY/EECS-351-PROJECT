//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
//==============================================================================
//
// LookAtTrianglesWithKey_ViewVolume.js (c) 2012 matsuda
//
//  MODIFIED 2014.02.19 J. Tumblin to 
//		--demonstrate multiple viewports (see 'draw()' function at bottom of file)
//		--draw ground plane in the 3D scene:  makeGroundPlane()

// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' +  //surface normal vector
  
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +  //transformation matrix of the normal vector

  'varying vec3 v_Position;\n' +
  'varying vec4 v_Color;\n' +
  'varying vec3 v_Normal;\n' +

  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_Position = vec3(u_ModelMatrix * a_Position);\n' +
  '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  '  v_Color = a_Color;\n' +
  '  gl_PointSize = 1.0;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +

  'uniform vec3 u_LightColor;\n' +          //light color
  'uniform vec3 u_LightPosition;\n' +       //position of the light source
  'uniform vec3 u_AmbientLightColor;\n' +   //ambient light color
  'uniform vec4 u_ColorMod;\n' +            //color modifier

  'varying vec4 v_Color;\n' +
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_Position;\n' + 

  'void main() {\n' +
  //normalize the normal because it is interpolated and is not 1.0 in length anymore
  '  vec3 normal = normalize(v_Normal);\n' +
  //calculate the light direction and make it 1.0 in length
  '  vec3 lightDirection = normalize(u_LightPosition-v_Position);\n' +
  //the dot product of the light direction and the normal
  '  float nDotL = max(dot(lightDirection, normal), 0.0);\n' +  //clamped value
  //calculate the final color from diffuse reflection and ambient reflection
  '  vec4 modColor = v_Color + u_ColorMod;\n' +
  '  vec3 diffuse = u_LightColor * modColor.rgb * nDotL;\n' +
  '  vec3 ambient = u_AmbientLightColor * modColor.rgb;\n' + 
  '  gl_FragColor = vec4(diffuse+ambient, modColor.a);\n' +
  '}\n';

var ANGLE_STEP = 45.0; 
var ANGLE_STEP_1 = 45.0; 
var floatsPerVertex = 10;	// # of Float32Array elements used for each vertex
													// (x,y,z)position + (r,g,b)color
var MOVE_STEP = 0.15;
var LOOK_STEP = 0.02;
var PHI_NOW = 0;
var THETA_NOW = 0;
var LAST_UPDATE = -1;

var modelMatrix = new Matrix4();
var viewMatrix = new Matrix4();
var projMatrix = new Matrix4();
var mvpMatrix = new Matrix4();
var normalMatrix = new Matrix4();
var colorMod = new Vector4();

var c30 = Math.sqrt(0.75);
var sq2 = Math.sqrt(2.0);

//var canvas;
function main() {
//==============================================================================
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');
  canvas.width=window.innerWidth;
  canvas.height=window.innerHeight-100;

  console.log('User Guide: Press Up/Down/Left/Right keys to change the eye position.')
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

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
	// unless the new Z value is closer to the eye than the old one..
  //	gl.depthFunc(gl.LESS);			 
	gl.enable(gl.DEPTH_TEST); 
	
  // Set the vertex coordinates and color (the blue triangle is in the front)
  var n = initVertexBuffers(gl);

  if (n < 0) {
    console.log('Failed to specify the vertex infromation');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.2, 0.2, 0.2, 1.0);

  // Get the storage locations of u_ViewMatrix and u_ProjMatrix variables
  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
  var u_AmbientLightColor = gl.getUniformLocation(gl.program, 'u_AmbientLightColor');
  var u_ColorMod = gl.getUniformLocation(gl.program, 'u_ColorMod');
  
  if (!u_MvpMatrix || !u_ModelMatrix || !u_NormalMatrix || !u_LightColor || !u_LightPosition || !u_AmbientLightColor || !u_ColorMod) { 
    console.log('Failed to get the location of uniform variables');
    return;
  }
 
 //world coordinate system
  //set the light color --> (1.0, 1.0, 1.0)
  gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);    //modified for better visual effect
  //set the light position --> "overhead" --> y=10.0
  gl.uniform3f(u_LightPosition, 10.0, 10.0, 10.0); //modified for better visual effect
  //set the ambient light color --> (0.3, 0.3, 0.3)
  gl.uniform3f(u_AmbientLightColor, 0.3, 0.3, 0.3);

 document.onkeydown = function(ev){ keydown(ev, gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle,currentAngle_1, canvas); };

 var currentAngle = 0.0;
 var currentAngle_1 = 0.0;

 var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
    currentAngle_1 = animate_1(currentAngle_1);
    draw(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle,currentAngle_1, canvas);   // Draw the triangles
    requestAnimationFrame(tick, canvas);   
                      // Request that the browser re-draw the webpage
 };
 tick(); 

}

 
function initVertexBuffers(gl) {
//==============================================================================
  
 
 
  makeGroundGrid();
  makeCylinder();
  makeAxes();
  makebasic();
  makeSphere();

  var mySiz = ( gndVerts.length+cylVerts.length+axVerts.length+basic.length+sphVerts.length);

 
  var nn = mySiz / floatsPerVertex;
  
  var colorShapes = new Float32Array(mySiz);

    gndStart=0;
  for(i=0,j=0;j<gndVerts.length; i++, j++){
    colorShapes[i]=gndVerts[j];
  }
    cylStart=i;
  for(j=0;j<cylVerts.length;i++,j++){
    colorShapes[i]=cylVerts[j];
  }
  
    axStart=i;
  for(j=0;j<axVerts.length;i++,j++){
    colorShapes[i]=axVerts[j];
  }
  
    basicStart = i;
  for(j=0;j<basic.length;i++,j++){
    colorShapes[i] = basic[j];
  }
    sphStart = i;           
  for(j=0; j< sphVerts.length; i++, j++) {
    colorShapes[i] = sphVerts[j];
    }


  var vertexColorbuffer = gl.createBuffer();  
  if (!vertexColorbuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  var shapeBufferHandle = gl.createBuffer();  
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  // (Use sparingly--may be slow if you transfer large shapes stored in files)
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?
    
  //Get graphics system's handle for our Vertex Shader's position-input variable: 
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  // Use handle to specify how to retrieve position data from our VBO:
  gl.vertexAttribPointer(
      a_Position,   // choose Vertex Shader attribute to fill with data
      4,            // how many values? 1,2,3 or 4.  (we're using x,y,z,w)
      gl.FLOAT,     // data type for each value: usually gl.FLOAT
      false,        // did we supply fixed-point data AND it needs normalizing?
      FSIZE * floatsPerVertex,    // Stride -- how many bytes used to store each vertex?
                    // (x,y,z,w, r,g,b) * bytes/value
      0);           // Offset -- now many bytes from START of buffer to the
                    // value we will actually use?
  gl.enableVertexAttribArray(a_Position);  
                    // Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve color data from our VBO:
  gl.vertexAttribPointer(
    a_Color,        // choose Vertex Shader attribute to fill with data
    3,              // how many values? 1,2,3 or 4. (we're using R,G,B)
    gl.FLOAT,       // data type for each value: usually gl.FLOAT
    false,          // did we supply fixed-point data AND it needs normalizing?
    FSIZE * floatsPerVertex,      // Stride -- how many bytes used to store each vertex?
                    // (x,y,z,w, r,g,b) * bytes/value
    FSIZE * 4);     // Offset -- how many bytes from START of buffer to the
                    // value we will actually use?  Need to skip over x,y,z,w
                    
  gl.enableVertexAttribArray(a_Color);  
                    // Enable assignment of vertex buffer object's position data
 var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if(a_Normal < 0)
  {
    console.log('Failed to get the storage location of a_Normal');
    return -1;
  }
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FSIZE * floatsPerVertex, FSIZE * 7);
  gl.enableVertexAttribArray(a_Normal);
  //--------------------------------DONE!
  // Unbind the buffer object 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}



// Global vars for Eye position. 
// NOTE!  I moved eyepoint BACKWARDS from the forest: from g_EyeZ=0.25
// a distance far enough away to see the whole 'forest' of trees within the
// 30-degree field-of-view of our 'perspective' camera.  I ALSO increased
// the 'keydown()' function's effect on g_EyeX position.


function keydown(ev, gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle,currentAngle_1, canvas) {
//------------------------------------------------------
//HTML calls this'Event handler' or 'callback function' when we press a key:

    if(ev.keyCode == 39) { // right arrow - step right
        up = new Vector3();
        up[0] = 0;
        up[1] = 1;
        up[2] = 0;
        look = new Vector3();
        look = vec3FromEye2LookAt(g_EyeX, g_EyeY, g_EyeZ, g_LookAtX, g_LookAtY, g_LookAtZ);

        tmpVec3 = new Vector3();
        tmpVec3 = vec3CrossProduct(up, look);

        //console.log(tmpVec3[0], tmpVec3[1], tmpVec3[2]);

        g_EyeX -= MOVE_STEP * tmpVec3[0];
        g_EyeY -= MOVE_STEP * tmpVec3[1];
        g_EyeZ -= MOVE_STEP * tmpVec3[2];

        g_LookAtX -= MOVE_STEP * tmpVec3[0];
        g_LookAtY -= MOVE_STEP * tmpVec3[1];
        g_LookAtZ -= MOVE_STEP * tmpVec3[2];

        console.log('eyeX=',g_EyeX, 'eyeY=', g_EyeY, 'eyeZ=', g_EyeZ, 'lookAtX=', g_LookAtX, 'lookAtY=', g_LookAtY, 'lookAtZ=', g_LookAtZ);
    } 
  else 
    if (ev.keyCode == 37) { // left arrow - step left
        up = new Vector3();
        up[0] = 0;
        up[1] = 1;
        up[2] = 0;
        look = new Vector3();
        look = vec3FromEye2LookAt(g_EyeX, g_EyeY, g_EyeZ, g_LookAtX, g_LookAtY, g_LookAtZ);

        tmpVec3 = new Vector3();
        tmpVec3 = vec3CrossProduct(up, look);

        //console.log(tmpVec3[0], tmpVec3[1], tmpVec3[2]);

        g_EyeX += MOVE_STEP * tmpVec3[0];
        g_EyeY += MOVE_STEP * tmpVec3[1];
        g_EyeZ += MOVE_STEP * tmpVec3[2];

        g_LookAtX += MOVE_STEP * tmpVec3[0];
        g_LookAtY += MOVE_STEP * tmpVec3[1];
        g_LookAtZ += MOVE_STEP * tmpVec3[2];

        console.log('eyeX=',g_EyeX, 'eyeY=', g_EyeY, 'eyeZ=', g_EyeZ, 'lookAtX=', g_LookAtX, 'lookAtY=', g_LookAtY, 'lookAtZ=', g_LookAtZ);
    } 
  else 
    if (ev.keyCode == 38) { // up arrow - step forward
        tmpVec3 = new Vector3();
        tmpVec3 = vec3FromEye2LookAt(g_EyeX, g_EyeY, g_EyeZ, g_LookAtX, g_LookAtY, g_LookAtZ);
        
        g_EyeX += MOVE_STEP * tmpVec3[0];
        g_EyeY += MOVE_STEP * tmpVec3[1];
        g_EyeZ += MOVE_STEP * tmpVec3[2];

        g_LookAtX += MOVE_STEP * tmpVec3[0];
        g_LookAtY += MOVE_STEP * tmpVec3[1];
        g_LookAtZ += MOVE_STEP * tmpVec3[2];

        console.log('eyeX=',g_EyeX, 'eyeY=', g_EyeY, 'eyeZ=', g_EyeZ, 'lookAtX=', g_LookAtX, 'lookAtY=', g_LookAtY, 'lookAtZ=', g_LookAtZ);

    } 
    else 
    if (ev.keyCode == 40) { // down arrow - step backward
        tmpVec3 = new Vector3();
        tmpVec3 = vec3FromEye2LookAt(g_EyeX, g_EyeY, g_EyeZ, g_LookAtX, g_LookAtY, g_LookAtZ);
        
        g_EyeX -= MOVE_STEP * tmpVec3[0];
        g_EyeY -= MOVE_STEP * tmpVec3[1];
        g_EyeZ -= MOVE_STEP * tmpVec3[2];

        g_LookAtX -= MOVE_STEP * tmpVec3[0];
        g_LookAtY -= MOVE_STEP * tmpVec3[1];
        g_LookAtZ -= MOVE_STEP * tmpVec3[2];

        console.log('eyeX=',g_EyeX, 'eyeY=', g_EyeY, 'eyeZ=', g_EyeZ, 'lookAtX=', g_LookAtX, 'lookAtY=', g_LookAtY, 'lookAtZ=', g_LookAtZ);
    } 
    else
    if (ev.keyCode == 65){ // a - look left
      if(LAST_UPDATE==-1 || LAST_UPDATE==0)
        {
          a = g_LookAtX - g_EyeX;
          b = g_LookAtY - g_EyeY;
          c = g_LookAtZ - g_EyeZ;
          l = Math.sqrt(a*a + b*b + c*c);
          
          lzx = Math.sqrt(a*a+c*c);
          sin_phi = lzx / l;

          theta0 = Math.PI -  Math.asin(a/lzx);

          THETA_NOW = theta0 + LOOK_STEP;
          
          LAST_UPDATE = 1;
        }
        else
        {
          THETA_NOW += LOOK_STEP;
        }

        g_LookAtY = b + g_EyeY;
        g_LookAtX = l * sin_phi * Math.sin(THETA_NOW) + g_EyeX;
        g_LookAtZ = l * sin_phi * Math.cos(THETA_NOW) + g_EyeZ;
    }

    else
      if(ev.keyCode==68){//d - look right
        if (LAST_UPDATE==-1 || LAST_UPDATE==0)
        {
          a = g_LookAtX - g_EyeX;
          b = g_LookAtY - g_EyeY;
          c = g_LookAtZ - g_EyeZ;
          l = Math.sqrt(a*a + b*b + c*c);
          lzx = Math.sqrt(a*a+c*c);
          sin_phi = lzx / l;

          theta0 = Math.PI -  Math.asin(a/lzx);

          THETA_NOW = theta0 - LOOK_STEP;
          
          LAST_UPDATE = 1;
        }
        else
        {
          THETA_NOW -= LOOK_STEP;
        }

        g_LookAtY = b + g_EyeY;
        g_LookAtX = l * sin_phi * Math.sin(THETA_NOW) + g_EyeX;
        g_LookAtZ = l * sin_phi * Math.cos(THETA_NOW) + g_EyeZ;
      }
    else
      if(ev.keyCode==87){ //w - look up
        if (LAST_UPDATE==-1 || LAST_UPDATE==1)
        {  
          a = g_LookAtX - g_EyeX;
          b = g_LookAtY - g_EyeY;
          c = g_LookAtZ - g_EyeZ;
          l = Math.sqrt(a*a + b*b + c*c);
          cos_theta = c / Math.sqrt(a*a + c*c);
          sin_theta = a / Math.sqrt(a*a + c*c);

          phi0 = Math.asin(b/l);

          PHI_NOW = phi0 + LOOK_STEP;
          LAST_UPDATE = 0;
        }
        else
        {
          PHI_NOW += LOOK_STEP;
        }

        g_LookAtY = l * Math.sin(PHI_NOW) + g_EyeY;
        g_LookAtX = l * Math.cos(PHI_NOW) * sin_theta + g_EyeX;
        g_LookAtZ = l * Math.cos(PHI_NOW) * cos_theta + g_EyeZ;
      }
    else
      if(ev.keyCode==83){ //s-look down
        if(LAST_UPDATE==-1 || LAST_UPDATE==1)
        { 
          a = g_LookAtX - g_EyeX;
          b = g_LookAtY - g_EyeY;
          c = g_LookAtZ - g_EyeZ;
          l = Math.sqrt(a*a + b*b + c*c);
  
          cos_theta = c / Math.sqrt(a*a + c*c);
          sin_theta = a / Math.sqrt(a*a + c*c);

          phi0 = Math.asin(b/l);

          PHI_NOW = phi0 - LOOK_STEP;
          
          
          LAST_UPDATE = 0;
        }
        else
        {
          PHI_NOW -= LOOK_STEP;
        }

        g_LookAtY = l * Math.sin(PHI_NOW) + g_EyeY;
        g_LookAtX = l * Math.cos(PHI_NOW) * sin_theta + g_EyeX;
        g_LookAtZ = l * Math.cos(PHI_NOW) * cos_theta + g_EyeZ;
      }
    else
      if(ev.keyCode==112){
        console.log(' F1.');
      document.getElementById('Help1').innerHTML= 'Use arrowkeys adjust view distance';
      document.getElementById('Help2').innerHTML= 'Use W/S/A/D keys to adjust view angle.';
      }
    else { return; } // Prevent the unnecessary drawing
    draw(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle,currentAngle_1, canvas);    
}

function vec3FromEye2LookAt(eyeX, eyeY, eyeZ, lookAtX, lookAtY, lookAtZ)
{
  result = new Vector3();
  
  dx = lookAtX - eyeX;
  dy = lookAtY - eyeY;
  dz = lookAtZ - eyeZ;
  amp = Math.sqrt(dx*dx + dy*dy + dz*dz);

  result[0] = dx/amp;
  result[1] = dy/amp;
  result[2] = dz/amp;

  return result;
}

function vec3CrossProduct(up, look) //UpVec x LookVec --> Left Vec
{
  r = new Vector3();

  r[0] = up[1]*look[2] - up[2]*look[1];
  console.log('up1', up[1]);
  r[1] = up[2]*look[0] - up[0]*look[2];
  r[2] = up[0]*look[1] - up[1]*look[0];

  amp = Math.sqrt(r[0]*r[0] + r[1]*r[1] + r[2]*r[2]) + 0.000001;

  r[0] /= amp;
  r[1] /= amp;
  r[2] /= amp;

  return r;
}

var g_EyeX = 0.20, g_EyeY = 0.25, g_EyeZ = 4.25; 
var g_LookAtX = 0.0, g_LookAtY = 0.0, g_LookAtZ = 0.0;

function draw(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, currentAngle_1,canvas) {
//==============================================================================
  
  // Clear <canvas> color AND DEPTH buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width/2, canvas.height);
  projMatrix.setPerspective(40, (0.5*canvas.width)/canvas.height, 1, 100);
 
    // Draw in the SECOND of several 'viewports'
  //------------------------------------------
	


	// but use a different 'view' matrix:
  viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, // eye position
  										g_LookAtX, g_LookAtY, g_LookAtZ, 									// look-at point 
  										0, 1, 0);									// up vector

  // Pass the view projection matrix to our shaders:
  
  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  
	// Draw the scene:
  
  drawMyScene(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle,currentAngle_1,canvas);

gl.viewport(canvas.width/2, 0, canvas.width/2, canvas.height);
  projMatrix.setOrtho(-0.5*canvas.width/300, 0.5*canvas.width/300,          // left,right;
                      -canvas.height/300, canvas.height/300,          // bottom, top;
                      1, 100);       // near, far; (always >=0)

  

  viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, // eye position
                      g_LookAtX, g_LookAtY, g_LookAtZ,                  // look-at point 
                      0, 1, 0);

  drawMyScene(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle,currentAngle_1,canvas);
  
  
}


function drawMyScene(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle,currentAngle_1, canvas) {


  pushMatrix(modelMatrix);
  modelMatrix.setTranslate(-1,0, 0.0);  // 'set' means DISCARD old matrix,
              
  modelMatrix.scale(1,1,-1);              
                                         

  modelMatrix.scale(0.7, 0.7, 0.7);

  pushMatrix(modelMatrix);
  modelMatrix.scale(0.3, 0.3, 0.3);
  
  
  
  
  
  modelMatrix.scale(1,1,-1);
  modelMatrix.rotate(5*currentAngle_1, 0, 0, 1);
  modelMatrix.scale(4,4,4);  
 
  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
     

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
  gl.drawArrays(gl.TRIANGLES, basicStart/floatsPerVertex,basic.length/floatsPerVertex);
  
  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
  gl.drawArrays(gl.LINES,             // use this drawing primitive, and
                axStart/floatsPerVertex, // start at this vertex number, and
                axVerts.length/floatsPerVertex);
  
  modelMatrix.rotate(90.0, 0, 0, 1);

  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
  gl.drawArrays(gl.TRIANGLES, basicStart/floatsPerVertex,basic.length/floatsPerVertex);


  modelMatrix.rotate(90.0, 0, 0, 1);
 

  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      // Draw just the first set of vertices: start at vertex 0...
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
  gl.drawArrays(gl.TRIANGLES, basicStart/floatsPerVertex,basic.length/floatsPerVertex);


  modelMatrix.rotate(90.0, 0, 0, 1);
  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
  gl.drawArrays(gl.TRIANGLES, basicStart/floatsPerVertex,basic.length/floatsPerVertex);

  
  //--------------------------------------------basic-----------------------------
  modelMatrix.setTranslate(1,-0.4,-1);
  modelMatrix.scale(0.8,0.8,0.8);
  modelMatrix.rotate(20,1,0,0);
  modelMatrix.rotate(20,0,1,0);
  
  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
  gl.drawArrays(gl.TRIANGLES, basicStart/floatsPerVertex,basic.length/floatsPerVertex);
  



      




  //--------------------sphere----------------------
  modelMatrix.setRotate(currentAngle,0,1,0);
  modelMatrix.translate(-1.0,-0.3,-3.0);
  modelMatrix.scale(3,3,3);
  
  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, sphStart/floatsPerVertex,sphVerts.length/floatsPerVertex);

 
 //------------cylinder1------------------
  modelMatrix.setTranslate(0.0,-0.4, -1);
  modelMatrix.scale(0.2,0.2,0.2);
  modelMatrix.rotate(-90.0,1,0,0);
  

  

  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0.5, 0.5, 0.5, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex,cylVerts.length/floatsPerVertex);

//-------------------cylinder2--------------------
  modelMatrix.rotate(currentAngle,1,1,0);
  modelMatrix.translate(0.0,0,1.5);
  modelMatrix.scale(0.8,0.8,0.8);
  

  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0.5, 0.5, 0.5, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex,cylVerts.length/floatsPerVertex);

//-------------------cylinder3---------------------------------------
  modelMatrix.rotate(currentAngle,1,1,0);
  modelMatrix.translate(0.0,0,1.5);
  modelMatrix.scale(0.8,0.8,0.8);
  

  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0.5, 0.5, 0.5, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex,cylVerts.length/floatsPerVertex);

  
//------------------cylinder4--------------------------------------

  modelMatrix.rotate(currentAngle,1,1,0);
  modelMatrix.translate(0.0,0,1.5);
  modelMatrix.scale(0.8,0.8,0.8);
  

  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0.5, 0.5, 0.5, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex,cylVerts.length/floatsPerVertex);


//-----------------cylinder5--------------------------------

  modelMatrix.rotate(currentAngle,1,1,0);
  modelMatrix.translate(0.0,0,1.5);
  modelMatrix.scale(0.8,0.8,0.8);
  

  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0.5, 0.5, 0.5, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex,cylVerts.length/floatsPerVertex);


  //-------------------cylinder6----------------------------------
  modelMatrix.rotate(currentAngle,1,1,0);
  modelMatrix.translate(0.0,0,1.5);
  modelMatrix.scale(0.8,0.8,0.8);
  

  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0.5, 0.5, 0.5, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex,cylVerts.length/floatsPerVertex);



//-------------------cylinder7----------------------------------
  modelMatrix.rotate(currentAngle,1,1,0);
  modelMatrix.translate(0.0,0,1.5);
  modelMatrix.scale(0.8,0.8,0.8);
  

  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0.5, 0.5, 0.5, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex,cylVerts.length/floatsPerVertex);

  
  //-------------------------------makeground_line---------------------------------
  modelMatrix.setTranslate(0.0, 0.0, 0.0);
  viewMatrix.rotate(-90.0, 1,0,0);	// new one has "+z points upwards",
  																		// made by rotating -90 deg on +x-axis.
  																		// Move those new drawing axes to the 
  																		// bottom of the trees:
	viewMatrix.translate(0.0, 0.0, -0.6);	
	viewMatrix.scale(0.4, 0.4,0.4);		// shrink the drawing axes 
																			//for nicer-looking ground-plane, and
  // Pass the modified view matrix to our shaders:
  
  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
  
  // Now, using these drawing axes, draw our ground plane: 
  gl.drawArrays(gl.LINES,							// use this drawing primitive, and
  							gndStart/floatsPerVertex,	// start at this vertex number, and
  							gndVerts.length/floatsPerVertex);		// draw this many vertices
  
  modelMatrix.setTranslate(-2.5,0,0);
  modelMatrix.scale(2,2,2);
  
  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
  gl.drawArrays(gl.LINES,             // use this drawing primitive, and
                axStart/floatsPerVertex, // start at this vertex number, and
                axVerts.length/floatsPerVertex);   // draw this many vertices


}
function makebasic(){
  c30 = Math.sqrt(0.75);          
  sq2 = Math.sqrt(2.0);
  
    basic = new Float32Array ([

     0.0,   0.0, sq2/2, 1.0,      1.0,  1.0,  1.0,   -8/3*c30,-sq2,1,// Node 0
     c30/2, -0.5/2, 0.0, 1.0,     0.5,  0.0,  0.5,  -8/3*c30,-sq2,1,// Node 1
     0.0,  1.0/2, 0.0, 1.0,       0.5,  0.5,  0.0,  -8/3*c30,-sq2,1,// Node 2
      // Face 1: (right side)
     0.0,  0.0, sq2/2, 1.0,       1.0,  1.0,  1.0,  Math.sqrt(6),sq2,1,// Node 0
     0.0,  1.0/2, 0.0, 1.0,       1.0,  0.0,  0.0,  Math.sqrt(6),sq2,1,// Node 2
    -c30/2, -0.5/2, 0.0, 1.0,     0.0,  1.0,  0.0,  Math.sqrt(6),sq2,1,// Node 3
      // Face 2: (lower side)
     0.0,  0.0, sq2/2, 1.0,       1.0,  1.0,  1.0,  -2/3*Math.sqrt(6),0,1,// Node 0 
    -c30/2, -0.5/2, 0.0, 1.0,     0.0,  0.5,  0.5,  -2/3*Math.sqrt(6),0,1,// Node 3
     c30/2, -0.5/2, 0.0, 1.0,     0.5,  0.0,  0.5,  -2/3*Math.sqrt(6),0,1,// Node 1 
      // Face 3: (base side)  
    -c30/2, -0.5/2, -0.0, 1.0,    0.0,  0.5,  0.5,  0,0,1,// Node 3
     0.0,  1.0/2, -0.0, 1.0,      0.5,  0.5,  0.0,  0,0,1,// Node 2
     c30/2, -0.5/2, -0.0, 1.0,    0.0,  0.0,  1.0,  0,0,1,
  ]);
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

  var xcount = 100;     // # of lines to draw in x,y to make the grid.
  var ycount = 100;   
  var xymax = 50.0;     // grid size; extends to cover +/-xymax in x and y.
  var xColr = new Float32Array([0.6, 0.3, 0.6]);  // bright yellow
  var yColr = new Float32Array([0.6, 0.2, 0.6]);  // bright green.
  
  // Create an (global) array to hold this ground-plane's vertices:
  gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
            // draw a grid made of xcount+ycount lines; 2 vertices per line.
            
  var xgap = xymax/(xcount-1);    // HALF-spacing between lines in x,y;
  var ygap = xymax/(ycount-1);    // (why half? because v==(0line number/2))
  
  // First, step thru x values as we make vertical lines of constant-x:
  for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
    if(v%2==0) {  // put even-numbered vertices at (xnow, -xymax, 0)
      gndVerts[j  ] = -xymax + (v  )*xgap;  // x
      gndVerts[j+1] = -xymax;               // y
      gndVerts[j+2] = 0.0;                  // z
      gndVerts[j+3] = 1.0;
    }
    else {        // put odd-numbered vertices at (xnow, +xymax, 0).
      gndVerts[j  ] = -xymax + (v-1)*xgap;  // x
      gndVerts[j+1] = xymax;                // y
      gndVerts[j+2] = 0.0;                  // z
      gndVerts[j+3] = 1.0;
    }
    gndVerts[j+4] = xColr[0];     // red
    gndVerts[j+5] = xColr[1];     // grn
    gndVerts[j+6] = xColr[2];     // blu
    gndVerts[j+7] = 0;  //dx
    gndVerts[j+8] = 0;  //dy
    gndVerts[j+9] = 1;  //dz
  }
  // Second, step thru y values as wqe make horizontal lines of constant-y:
  // (don't re-initialize j--we're adding more vertices to the array)
  for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
    if(v%2==0) {    // put even-numbered vertices at (-xymax, ynow, 0)
      gndVerts[j  ] = -xymax;               // x
      gndVerts[j+1] = -xymax + (v  )*ygap;  // y
      gndVerts[j+2] = 0.0;                  // z
      gndVerts[j+3] = 1.0;
    }
    else {          // put odd-numbered vertices at (+xymax, ynow, 0).
      gndVerts[j  ] = xymax;                // x
      gndVerts[j+1] = -xymax + (v-1)*ygap;  // y
      gndVerts[j+2] = 0.0;                  // z
      gndVerts[j+3] = 1.0;
    }
    gndVerts[j+4] = yColr[0];     // red
    gndVerts[j+5] = yColr[1];     // grn
    gndVerts[j+6] = yColr[2];     // blu
    gndVerts[j+7] = 0;  //dx
    gndVerts[j+8] = 0;  //dy
    gndVerts[j+9] = 1;  //dz
  }
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
        sphVerts[j+7] = 0;  //dx
        sphVerts[j+8] = 0;  //dy
        sphVerts[j+9] = 1;  //dz  
        }
      else if(s==slices-1) {
        sphVerts[j+4]=Math.random(); 
        sphVerts[j+5]=Math.random();
        sphVerts[j+6]=Math.random();
        sphVerts[j+7] = 0;  //dx
        sphVerts[j+8] = 0;  //dy
        sphVerts[j+9] = 1;  //dz  
      }
      else if(s%2 == 0 && s != slices-1 && s!= 0){
          sphVerts[j+4]=Math.random(); 
          sphVerts[j+5]=Math.random();
          sphVerts[j+6]=Math.random();
          sphVerts[j+7] = 0;  //dx
          sphVerts[j+8] = 0;  //dy
          sphVerts[j+9] = 1;  //dz           
      }else{
          sphVerts[j+4]=Math.random();
          sphVerts[j+5]=Math.random();
          sphVerts[j+6]=Math.random();
          sphVerts[j+7] = 0;  //dx
          sphVerts[j+8] = 0;  //dy
          sphVerts[j+9] = 1;  //dz  
      }
    }
  }
}



function makeCylinder() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var ctrColr = new Float32Array([0.2, 0.2, 0.2]); // dark gray
 var topColr = new Float32Array([0.2, 0.2, 0.8]); // light green
 var botColr = new Float32Array([0.2, 0.2, 0.8]); // light blue
 var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
 var botRadius = 1.6;   // radius of bottom of cylinder (top always 1.0)
 
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
      cylVerts[j+4]=ctrColr[0]; 
      cylVerts[j+5]=ctrColr[1]; 
      cylVerts[j+6]=ctrColr[2];
      cylVerts[j+7] = 0;  //dx
      cylVerts[j+8] = 0;  //dy
      cylVerts[j+9] = 1;  //dz
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
      cylVerts[j+4]=topColr[0]; 
      cylVerts[j+5]=topColr[1]; 
      cylVerts[j+6]=topColr[2];
      cylVerts[j+7] = 0;  //dx
      cylVerts[j+8] = 0;  //dy
      cylVerts[j+9] = 1;  //dz     
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
        cylVerts[j+4]=topColr[0]; 
        cylVerts[j+5]=topColr[1]; 
        cylVerts[j+6]=topColr[2];  
        cylVerts[j+7] = Math.cos(Math.PI*(v)/capVerts); //dx
      cylVerts[j+8] = Math.sin(Math.PI*(v)/capVerts); //dy
      cylVerts[j+9] = 0;   
    }
    else    // position all odd# vertices along the bottom cap:
    {
        cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        cylVerts[j+2] =-1.0;  // z
        cylVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        cylVerts[j+4]=botColr[0]; 
        cylVerts[j+5]=botColr[1]; 
        cylVerts[j+6]=botColr[2];  
        cylVerts[j+7] = Math.cos(Math.PI*(v-1)/capVerts); //dx
        cylVerts[j+8] = Math.sin(Math.PI*(v-1)/capVerts); //dy
        cylVerts[j+9] = 0;   
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
      cylVerts[j+4]=botColr[0]; 
      cylVerts[j+5]=botColr[1]; 
      cylVerts[j+6]=botColr[2]; 
      cylVerts[j+7] = 0;
      cylVerts[j+8] = 0;
      cylVerts[j+9] = -1;   
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      cylVerts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
      cylVerts[j+1] = 0.0;  
      cylVerts[j+2] =-1.0; 
      cylVerts[j+3] = 1.0;      // r,g,b = botColr[]
      cylVerts[j+4]=botColr[0]; 
      cylVerts[j+5]=botColr[1]; 
      cylVerts[j+6]=botColr[2];
      cylVerts[j+7] = 0;
      cylVerts[j+8] = 0;
      cylVerts[j+9] = -1;
    }

  }
}


function makeAxes(){
   axVerts = new Float32Array([
     0,0,0,1,     1.0,1.0,1.0, 0,1,0,
     1,0,0,1,     1.0, 0.0,  0.0,  0,1,0,

     0,0,0,1,     1.0,1.0,1.0,  0,0,1,
     0,1,0,1,     0.0,  1.0,  0.0,  0,0,1,

     0,0,0,1,     1.0,1.0,1.0,  1,0,0,
     0,0,1,1,     0.0,0.0,1.0,  1,0,0,
    ]);
}



var g_last = Date.now();
var g_last_1 = Date.now();

function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
if(angle >  30.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
if(angle < -30.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
return newAngle %= 360;
}


function animate_1(angle){
  var now = Date.now();
  var elapsed = now - g_last_1;
  g_last_1 = now;

  var newAngle = angle + (ANGLE_STEP_1 * elapsed) / 1000.0;
  return newAngle %= 360;
}


function resize()
{
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight-100;
}
