/* QuiNote Software Group 2015
Authors: Kathryn Glover, Elliott Warkus, Cameron Basham

Contains code responsible for managing interaction between 
UI elements and hidden user-side functions (parsing, quiz
creation).

 */

//**************************************
// GLOBAL VARIABLES
//**************************************

// Need to be wary of namespace collisions with these titles
var parseResult;
var optionList;
var quiz;
var totalQuestions;
var numberCorrect;
var currentQuestion;
var choices;
var selectTF = ["true", "false"]; // undesirable
var statusFlag = true;
var quizFired = false;

//**************************************
// HANDLERS / LISTENERS
//**************************************

$(document).ready(function() {
	$('#buttonGenerateQuiz').click(function() { // GENERATE QUIZ
		
		//retrieve and parse text
		// input depends on context (editor vs quiz-only)
		if (typeof QUIZ_ONLY_FLAG === "undefined") {
			parseResult = parseInput(getEditorHtml());
		} else {
			var container = $('#multi-service-container');
 			var text = container.data('multicontent');
					
			text = text.replace(/<br>/g, "<br />");
			
			parseResult = parseInput(text);
		}
		
		// check to make sure notes are of sufficient size
		if (parseResult.identifiers.length < 4) {
			alert("You need more notes to make a quiz!");
			$("#quizDialog").removeClass("dialogVisible");
			return;
		}
		
		// retrieve quantities for each type of question
		var numMC = parseInt($("#qLengthMC").val());
		if (isNaN(numMC)) { numMC = 0; }
		var numTF = parseInt($("#qLengthTF").val());
		if (isNaN(numTF)) { numTF = 0; }
		var numFB = parseInt($("#qLengthFB").val());
		if (isNaN(numFB)) { numFB = 0; }
		setQLength();
		
		totalQuestions = numMC + numTF + numFB;
		
		// check for valid quantity inputs
		if (totalQuestions < 1 || isNaN(totalQuestions)) {
			alert("Please choose at least one question type!");
			$("#quizDialog").removeClass("dialogVisible");
			return;
		}
		
		optionList = new OptionList(numMC, numTF, numFB);
		quiz = makeQuiz(parseResult, optionList);
		console.log(parseResult, quiz);
		totalQuestions = quiz.size();
		numberCorrect = 0;
		
		$('#quizframe').toggle();
		$('#scorepage').toggle();
		$('#quizDialog').css("z-index", "4");
		$('#pagecontainer').css({"-webkit-filter" : "blur(3px)"});
		$('#homeContainer').css({"-webkit-filter" : "blur(3px)"});
		
		// check to see if a quiz has been called
		if (quizFired) {
			$("#scorepage").css({"display" : "none"});
			hideCorrect();
			hideIncorrect();
			$("#quizopener").css({"display" : "block"});
			$("#quizframe").toggle();
			$("#question").toggle();
		} else {
			quizFired = true;
		}

	});
	
	$('#buttonCloseQuiz').click(function(){
		$('#quizDialog').css("z-index", "-10");
		$('#pagecontainer').css({"-webkit-filter" : "blur(0px)"});
		$('#homeContainer').css({"-webkit-filter" : "blur(0px)"});
	});
	
	$('#buttonStartQuiz').click(function(){
		$('#quizframe').toggle();

		nextQuestion();
		statusFlag = false;
	});
	
	
	
	$("#buttonNext").click(function() { // NEXT button
		nextHandler();
		
	});
	
	// Listener for Note Index
	$("#sidebar").mouseenter( function() { // handlerIn
		$("li.identifier-element").hover( 
			function() { // handlerIn
				var identifier = $(this).html();
				if (identifier.indexOf(":") === -1) {
					var element = parser_currentParse.getElementByKey(identifier);
					showDefinitions(element, $(this));
				}
			},
			function() { // handlerOut
				$("#hoverDiv").toggle(false);
				var contents = $(this).html();
				$(this).html(contents.split(":")[0].trim());
			}
		).css({ "cursor" : "pointer"});
	});
	
	function showDefinitions(element, container) {
		var displayString = "<i style='color:#666'>";
		var position = container.position();
		var newTop = position.top;
		var newLeft = position.left + container.width();
		for (var i=0; i<element.definitions.length; i++) {
			displayString += element.definitions[i];
			if (i < element.definitions.length - 1) {
				displayString += "; ";
			}
		}
		displayString += "</i>";
		container.html(element.getIdentifier() + ": " + displayString);
	}
	
	// question number field listeners
	$("#qLengthMC").change( function() {
		// set to 0 if NaN
		if (isNaN($("#qLengthMC").val())) $("#qLengthMC").val(0); 
		//update qLength field
		setQLength();
	});

	$("#qLengthTF").change( function() {
		if (isNaN($("#qLengthTF").val())) $("#qLengthTF").val(0); 
		setQLength();
	});

	$("#qLengthFB").change( function() {
		if (isNaN($("#qLengthFB").val())) $("#qLengthFB").val(0); 
		setQLength();
	});

	function setQLength() {
		// set qLength field to sum of question types
		var numMC = parseInt($("#qLengthMC").val());
		if (isNaN(numMC)) numMC = 0;
		var numTF = parseInt($("#qLengthTF").val());
		if (isNaN(numTF)) numTF = 0;
		var numFB = parseInt($("#qLengthFB").val()); 
		if (isNaN(numFB)) numFB = 0;
		$("#qLength").val(numMC + numTF + numFB);
	}
	
});

//**************************************
// FUNCTIONS
//**************************************

function checkAnswer() {
	
	document.getElementById("checkCon").style.visibility="visible";
	document.getElementById("answerSelections").style.visibility="hidden";
	
	
	if (currentQuestion instanceof MultipleChoiceQuestion) {
		checkMCQuestion();
	} else if (currentQuestion instanceof TrueFalseQuestion) {
		checkTFQuestion();
	} else if (currentQuestion instanceof FillInTheBlankQuestion) {
		checkFITBQuestion();
	}
	statusFlag = true;
}

function checkMCQuestion() {
	var inputs = $("[name='rd']");
	var index = -1;
	for (i=0; i<inputs.length; i++) {
		if (inputs[i].checked) {
			index = i;
		}
	}
	if (index === -1) {
        document.getElementById("answerSelections").style.visibility="visible";
		alert("Please select an answer");
	} else {
		var selected = choices[index];
		if (selected === currentQuestion.answer) {
			showCorrect();
			numberCorrect++;
		} else {
			showIncorrect();
		}
		inputs[index].checked = false;
		checkPage();
	}
}

function checkTFQuestion() {
	var inputs = $("[name='ch']");
	var index = -1;
	for (i=0; i<inputs.length; i++) {
		if (inputs[i].checked) {
			index = i;
		}
	}
	if (index === -1) {
        document.getElementById("answerSelections").style.visibility="visible";
		alert("Please select an answer");
	} else {
		var selected = selectTF[index];
		if (selected === currentQuestion.answer) {
			showCorrect();
			numberCorrect++;
		} else {
			showIncorrect();
		}
		inputs[index].checked = false;
		checkPage();
	}
}

function checkFITBQuestion() {
	var answerField = $("#ansText");
	var input = $("#ansText").val();
	if (input === "") {
        document.getElementById("answerSelections").style.visibility="visible";
		alert("Please enter an answer.");
	} else {
		if (input === currentQuestion.answer) {
			showCorrect();
			numberCorrect++;
		} else {
			showIncorrect();
		}
		answerField.val("");
		checkPage();
	}
}
		

function nextHandler() {
	// decide what to do upon pressing the 'next' button
	if (quiz.hasNext()) {
		if (statusFlag) {
			nextQuestion();
			statusFlag = false;
		} 
	} else {
		completeQuiz();
		
	}
}

function nextQuestion() {
	
	document.getElementById("answerSelections").style.visibility="";
	document.getElementById("buttonCheck").style.display="";
	document.getElementById("buttonNext").style.display="none";
	hideIncorrect();
	hideCorrect();
	
	//global?
	currentQuestion = quiz.getNext();
	if (currentQuestion instanceof MultipleChoiceQuestion) {
		initializeMCQuestion(currentQuestion);
	} else if (currentQuestion instanceof TrueFalseQuestion) {
		initializeTFQuestion(currentQuestion);
	} else if (currentQuestion instanceof FillInTheBlankQuestion) {
		initializeFITBQuestion(currentQuestion);
	} else {
		// should be unreachable
		console.log("Error: Question type unrecognized.");
	}
}
	

function initializeMCQuestion(question) {
	choices = currentQuestion.getAllAnswers();
	var questionTag = $("#question");
	$(questionTag).html(question.getText());
	hideText();
	showRadioChoice();
	showRadiobuttons(question);
	hideCheck();
	
	$("#answer_choice").insertAfter("#formAction");
}

function initializeTFQuestion(question) {
	var questionTag = $("#question");
	$(questionTag).html(question.getText());
	hideChoice();
	hideText();
	showCheckbuttons();
	showCheck();
	
	$("#answer_check").insertAfter("#formAction");
}

function initializeFITBQuestion(question) {
	var questionTag = $("#question");
	$(questionTag).html(question.getText());
	hideChoice();
	showText();
	hideCheck();
	$("#answer_text").insertAfter("#formAction");
}


///// COPIED FUNCTIONS /////

function showQuiz(){
	document.getElementById("quizopener").style.display="none";
	document.getElementById("quizframe").style.visibility="visible";
	document.getElementById("scorepage").style.display="none";
	//document.getElementById("svgOpener").style.display="none";
	document.getElementById("scoreKeeper").style.display="none";
	document.getElementById("one").style.display="none";
	document.getElementById("two").style.display="none";
};

function unshowQuiz() { 
	
	//$("#quizopener").style.display="none";
	$("#quizframe").style.visibility="hidden";
	//$("#scorepage").style.display="none";
	//$("#svgOpener").style.display="none";
	//$("#scoreKeeper").style.display="none";
	//$("#one").style.display="none";
	//$("#two").style.display="none";
}

function checkPage(){
	document.getElementById("buttonCheck").style.display="none";
	document.getElementById("buttonNext").style.display="";
}
function showCheck(){
	document.getElementById("answer_check").style.display="";
}
function hideCheck(){
	document.getElementById("answer_check").style.display="none";
}
function showText(){
	document.getElementById("answer_text").style.display="";
}
function hideText(){
	document.getElementById("answer_text").style.display="none";
}
function showRadiobuttons(question){	
	document.getElementById("rad1").innerHTML = choices[0];
	document.getElementById("rad2").innerHTML = choices[1];
	document.getElementById("rad3").innerHTML = choices[2];
	document.getElementById("rad4").innerHTML = choices[3];
	document.getElementById("rad1").value = choices[0];
	document.getElementById("rad2").value = choices[1];
	document.getElementById("rad3").value = choices[2];
	document.getElementById("rad4").value = choices[3];
}
function showCheckbuttons(){
	document.getElementById("true").innerHTML = selectTF[0];
	document.getElementById("false").innerHT = selectTF[1];
	document.getElementById("true").value = selectTF[0];
	document.getElementById("false").value = selectTF[1];
}
function showRadioChoice(){
	document.getElementById("answer_choice").style.display="";
}
function hideChoice(){
	document.getElementById("answer_choice").style.display="none";
}
function hideCorrect(){
	document.getElementById("one").style.display="none";
}
function hideIncorrect(){
	document.getElementById("two").style.display="none";
}
function showCorrect(){
	document.getElementById("one").style.display="";
	$('#one').toggle;
	var oneAns=document.getElementById("one");
	var aText=" is correct!";
	var answer = currentQuestion.answer;
	if (answer.charAt(answer.length-1) !== "\"") { answer = answer + "\""; }
	if (answer.charAt(0) !== "\"") { answer = "\"" + answer; }
	oneAns.innerHTML= answer + aText;
	document.getElementById("buttonNext").style.display="";
}
function showIncorrect(){
	document.getElementById("two").style.display="";
	$('#two').toggle;
	var twoAns=document.getElementById("two");
	var a2Text="Incorrect! The answer is: ";
	var answer = currentQuestion.answer;
	if (answer.charAt(answer.length-1) !== "\"") { answer = answer + "\""; }
	if (answer.charAt(0) !== "\"") { answer = "\"" + answer; }
	twoAns.innerHTML= a2Text + answer;
	document.getElementById("buttonNext").style.display="";	
}

function uninitQuizFrame() {
	var overlay = document.querySelector( '.dialogShadow' );
	[].slice.call( document.querySelectorAll( '.dialogTrigger' ) ).forEach( function( el, i ) {
		var transform = document.querySelector( '#quizDialog' ),
		close = transform.querySelector( '.dialogClose' );
		function removeDialog() {
			$("#quizDialog").removeClass("dialogVisible");
		}
		function removeDialogHandler() {
			removeDialog();
		}
		el.addEventListener( 'click', function( ev ) {
			$("#quizDialog").addClass("dialogVisible");
		});
		close.addEventListener( 'click', function( ev ) {
			removeDialogHandler();
		});
	});
}

var dialog = (function() {
	function init() {
		[].slice.call( document.querySelectorAll( '.dialogTrigger' ) ).forEach( function( el, i ) {
			var transform = document.querySelector( '#quizDialog' ),
			close = transform.querySelector( '.dialogClose' );
			function removedialog() {
				$("#quizDialog").removeClass("dialogVisible");
			}
			function removedialogHandler() {
				removedialog();
			}
			el.addEventListener( 'click', function( ev ) {
				$("#quizDialog").addClass("dialogVisible");
			});
			close.addEventListener( 'click', function( ev ) {
				removedialogHandler();
			});
		});
	}
	init();
})();

function randomizeQuiz(){};

function completeQuiz(){
	var score_exit;
	document.getElementById("scr").value = score_exit;
	var om = document.getElementById("qLength").value;
	var tot = (parseInt(om));
	$("#question").html("<h4>Your score is: "+numberCorrect+"/"+totalQuestions+"<h4>");
	$("#scoreDisplay").html("" +numberCorrect+"/"+totalQuestions+ "");

	$("#answer_text").toggle();
	$("#answer_choice").toggle();
	$("#answer_check").toggle();
	$("#scorepage").toggle();
	$("#buttonNext").toggle();
	$("#question").toggle();
	$("#quizframe").toggle();
};


$(function(){
	$("#editorspace").draggable({
		handle: "#mceu_8, #editorToolbar",
		containment: "#pagecontainer",
		scroll: true
	});
	$("#sidebar").draggable({ 
		containment: "#pagecontainer",
		scroll: true });
});
$(".numberonly").on("keypress keyup blur",function (event) {    
          $(this).val($(this).val().replace(/[^\d].+/, ""));
           if ((event.which < 48 || event.which > 57)) {
               event.preventDefault();
           }
       });