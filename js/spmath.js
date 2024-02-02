let strokePoints = [];
let xArray = [];
let yArray = [];
let isDown = false;
let recognizeTimer;
const RECOGNIZE_TIME = 500;
let canvas = document.getElementById('hwrCanvas');

let serverUrl = 'SERVER_URL';
let headers = {
  "Authorization": "Bearer API_KEY",
  "Content-Type": "application/json"
}

function Stroke(x, y) {
  this.x = x;
  this.y = y;
}

window.onload = function () {
  setHwrCanvas();
  setRanges();
  initialize();
};

// 터치 이벤트 처리
function touchDown() {
  isDown = true;
  $('.candidate-item').text(function () {
    return '';
  });
  if (recognizeTimer) {
    clearTimeout(recognizeTimer);
  }
}

function touchMove() {
  if (xArray.length > 1 && yArray.length > 1) {
    $('canvas').drawLine({
      strokeStyle: '#5577fb',
      strokeWidth: 3,
      x1: xArray[xArray.length - 2],
      y1: yArray[yArray.length - 2],
      x2: xArray[xArray.length - 1],
      y2: yArray[yArray.length - 1]
    });
  }
}

function touchUp() {
  strokePoints.push(new Stroke(xArray, yArray));
  xArray = [];
  yArray = [];
  isDown = false;
  recognizeTimer = setTimeout(recognize, RECOGNIZE_TIME);
}

function setMounsePos(event) {
  const mounseX = event.offsetX * canvas.width / canvas.clientWidth | 0;
  const mounseY = event.offsetY * canvas.height / canvas.clientHeight | 0;
  xArray.push(parseInt(mounseX));
  yArray.push(parseInt(mounseY));
}

function setTouchPos(event) {
  const touches = event.originalEvent.touches;
  if (touches) {
    if (touches.length == 1) { // Only deal with one finger
      const touch = touches[0]; // Get the information for finger #1
      const touchX = (touch.pageX - touch.target.offsetLeft) * canvas.width / canvas.clientWidth | 0;
      const touchY = (touch.pageY - touch.target.offsetTop) * canvas.height / canvas.clientHeight | 0;
      xArray.push(touchX);
      yArray.push(touchY);
    }
  }
}

function setHwrCanvas() {
  $('#hwrCanvas').on("mousedown", function (event) {
    setMounsePos(event);
    touchDown();

  });
  $('#hwrCanvas').on("mousemove", function (event) {
    if (isDown) {
      setMounsePos(event);
      touchMove();
    }
  });
  $('#hwrCanvas').on("mouseup", function (event) {
    setMounsePos(event);
    touchUp();
  });

  $('#hwrCanvas').on("touchstart", function (event) {
    setTouchPos(event);
    touchDown();
    event.preventDefault();
  });
  $('#hwrCanvas').on("touchmove", function (event) {
    if (isDown) {
      setTouchPos(event);
      touchMove();
    }
    event.preventDefault();
  });
  $('#hwrCanvas').on("touchend", function (event) {
    setTouchPos(event);
    touchUp();
    event.preventDefault();
  });
}

// 수식 인식 지원 타입 확인
function setRanges() {
  $.ajax({
    url: serverUrl + '/math/ranges',
    headers: headers,
    dataType: 'json',
    type: 'GET',
    success: function (result) {
      result.sort((a, b) => {
        if (a.english_name > b.english_name) {
          return 1;
        } else if (a.english_name < b.english_name) {
          return -1;
        } else {
          return 0;
        }
      });
      for (let index in result) {
        $('#math_range').append('<option>' + result[index]['english_name'] + '</option>');
      }
    },
  });
}

// 수식 렌더링
function renderMath(inputs) {
  outputs = document.getElementsByClassName('candidate-item');
  for (let i = 0; i < inputs.length; i++) {
    if (i >= outputs.length) {
      break;
    }
    const output = outputs[i];
    output.innerHTML = '';
    MathJax.texReset();
    const options = MathJax.getMetricsFor(output);
    const input = inputs[i];
    if (input) {
      const node = MathJax.tex2chtml(input, options);
      output.appendChild(node);
      MathJax.startup.document.clear();
      MathJax.startup.document.updateDocument();
    }
  }
}

// 수식 인식
function recognize() {
  const value = $('#math_range option:selected').val();

  const dataJson = JSON.stringify({
    range: value,
    maxCandidateCount: 3,
    inks: strokePoints,
    answer: ""
  });

  console.log("[REQEUST]", dataJson)

  $.ajax({
    url: serverUrl + '/math/recognize',
    dataType: 'json',
    headers: headers,
    type: 'POST',
    data: dataJson,
    contentType: "application/json",
    success: function (result) {
      console.log("[RESPONSE]:", JSON.stringify(result))

      if (result['candidates'].length == 0) {
        $(".candidate-item").text("No Result");
      } else {
        renderMath(result['candidates'])
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.log("error");
    }
  });
}

function clearCanvas() {
  $('#hwrCanvas').clearCanvas();
  strokePoints.length = 0;
  if (recognizeTimer) {
    clearTimeout(recognizeTimer);
  }

  $('.candidate-item').text(function (index) {
    return '';
  });
}

function initialize() {
  window.addEventListener('resize', resizeCanvas, false);
  window.addEventListener("orientationchange", clearCanvas, false);
  resizeCanvas();
}

function resizeCanvas() {
  const html = document.documentElement;
  const margin = 8; // avoid to show scroll-bar
  canvas.width = html.clientWidth;
  canvas.height = html.clientHeight - margin;
  clearCanvas();
}

$('#clear').on('click', function (e) {
  clearCanvas();
});
