window.addEventListener('load',()=>{
    document.getElementsByClassName('loader-container')[0].style.display='none';
    
})


  document.addEventListener('keydown',function(event) {
    if (event.key == 'F11') {
        event.preventDefault();
        fullScreenFunc(); // From fullscreen API
    }
})
 

function fullScreenFunc(){
    if(document.fullscreenElement || document.webkitFullscreenElement){
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
      }
      document.getElementById('full-screen-button').src='../svg-public/fullscreen.svg'
    }
    else{

      if (document.getElementById('higher-container').requestFullscreen) {

        document.getElementById('higher-container').requestFullscreen();
      } else if (document.getElementById('higher-container').webkitRequestFullscreen) { /* Safari */
  
        document.getElementById('higher-container').webkitRequestFullscreen();
      } else if (document.getElementById('higher-container').msRequestFullscreen) { /* IE11 */
        document.getElementById('higher-container').msRequestFullscreen();
      }
      document.getElementById('full-screen-button').src='../svg-public/exitfullscreen.svg'
    }

}