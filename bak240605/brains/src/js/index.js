var moment = require('moment'); // require for turning AU time into a workable format

$(document).ready(function(){

	function exportToArray() { // create an array before exporting to HTML table

		// inactivate table
		let table = $(document).find('[data-results-output]');
		table.addClass('is-inactive');
		let resultsJSON = []; 
		var regex = /^([a-zA-Z0-9\s_\\.\-:])+(.csv)$/;  
		//Checks whether the file is a valid csv file    
		if (regex.test($("[data-file-upload]").val().toLowerCase())) {  
			//Checks whether the browser supports HTML5    
			if (typeof(FileReader) != "undefined") {  
				var reader = new FileReader();  
				reader.onload = function(e) {  
					//Splitting of Rows in the csv file    
					var csvrows = e.target.result.split("\n"); 
					var headings = csvrows[0].split(","); // put the first row into an array of headings
					for (var i = 1; i < csvrows.length; i++) {  // start at i=1 to skip headings row
						if (csvrows[i] != "") {
							var rowJSON = {};
							var csvcols = csvrows[i].split(",");  
							//Looping through each cell in a csv row    
							for (var j = 0; j < csvcols.length; j++) {								
								rowJSON[headings[j]] = csvcols[j];
							}
							resultsJSON.push(rowJSON);  
						}  
					}
					filterDates(resultsJSON);
				}  
				reader.readAsText($("[data-file-upload]")[0].files[0]);  
			} else {  
				alert("Sorry! Your browser does not support HTML5!");  
			}  
		} else {  
			alert("Please upload a valid CSV file!");  
		}
	}  

	function filterDates(resultsJSON) {
	
		// get the start and end dates
		let startDate = parseInt($(document).find('[data-start-date]').attr('data-date'));
		let endDate = parseInt($(document).find('[data-end-date]').attr('data-date'));

		// for each line item, except the first row of headings
		$(resultsJSON).each(function(index){
			let row = $(this);
			// filter out any rows outside the dates set above
			// get date
			let date = row[0]['date'];

			// convert format
			date = date.split('/');
			date = date[1]+'/'+date[0]+'/'+date[2]; // mm/dd/yyyy because of idiot americans
			date = new Date(date);

			startDate = new Date(startDate);
			endDate = new Date(endDate);
			
			// less than startDate, remove
			if(date < startDate){
				delete resultsJSON[index];
			}
			// greater than endDate, remove
			if(date > endDate){
				delete resultsJSON[index];
			}

		})
		filterIrrelevant(resultsJSON);
	}

	function filterIrrelevant(resultsJSON) {
	
		// for each line item, except the first row of headings
		$(resultsJSON).each(function(index){
			let row = $(this);
			// unsubmitted, remove
			// zero grade total, remove
			if(row['grade total'] == 0){
				delete resultsJSON[index];
			}
			// special consideration, remove
			if(row['type'] == 'special consideration'){
				delete resultsJSON[index];
			}
			// not graded / opela, remove
			if(row['type'] == 'opela'){
				delete resultsJSON[index];
			}
			// submission type = none, remove
		})
		mergeStudent(resultsJSON);
	}

	function mergeStudent(resultsJSON){

		// all rows with the same email become a set of results for a student
		let namesArray = [];
		$(resultsJSON).each(function(index){
			let row = this;
			// clear any "deleted" rows from before
			if(row['email'] === undefined){
				resultsJSON.splice(index, 1);
			}else{
				namesArray.push(row['email']); // for unique array of names
			}
		});
		// get array of unique names
		namesArray = $.unique(namesArray);

		let mergedArray = [];
		
		$(namesArray).each(function(){
			let thisName = String(this);
			let thisStudent = [];
			thisStudent['results'] = [];
			thisStudent['name'] = thisName;
			$(resultsJSON).each(function(){
				let row = this;
				let name = String(row["email"]);
				if(name == thisName){
					thisStudent['results'].push(row);
				}
			})	
			mergedArray.push(thisStudent);
		})
		calcResults(mergedArray);
	}

	function calcResults(mergedArray){
		// for each student
		$(mergedArray).each(function(){
			let thisStudent = this;
			let thisTotalGrade = 0;
			let thisTotalGradeTotal = 0;

			// for each result
			$(thisStudent["results"]).each(function(){
				let thisResult = this;
				let thisGrade = parseInt(thisResult['grade']);
				let thisGradeTotal = parseInt(thisResult['grade total']);
				
				// calc pass / fail
				if(thisGrade < (thisGradeTotal / 2)){
					thisResult["passFail"] = "fail";
				}else{
					thisResult["passFail"] = "pass";
				}
				thisTotalGrade = thisTotalGrade + thisGrade; // add to the overall total for this student
				thisTotalGradeTotal = thisTotalGradeTotal + thisGradeTotal; // add to the overall total for this student
			});
			// get total result	if(thisGrade < (thisGradeTotal / 2)){
			if(thisTotalGrade < (thisTotalGradeTotal / 2)){
				thisStudent["passFail"] = "fail";
			}else{
				thisStudent["passFail"] = "pass";
			}
		})

		processTable(mergedArray);
	}

	function processTable(data){
			let table = $(document).find('[data-results-output]');
			table.html(''); // clear table ready for new data
			$(data).each(function(){
				let thisStudent = this;
				let htmlRow = '<tr>';
				htmlRow += '<td>'+thisStudent["name"]+'</td>';
				htmlRow += '<td class="'+thisStudent['passFail']+'">Overall: '+thisStudent["passFail"]+'</td>';
				htmlRow += '<td><table><tr><th>Grade</th><th>Total</th><th>Pass/fail</th><th>Date taken</th></tr>';
				$(thisStudent['results']).each(function(){
					let thisResult = this;
					htmlRow += '<tr>';
					htmlRow += '<td>'+thisResult['grade']+'</td>';
					htmlRow += '<td>'+thisResult['grade total']+'</td>';
					htmlRow += '<td class="'+thisResult['passFail']+'">'+thisResult['passFail']+'</td>';
					htmlRow += '<td>'+thisResult['date']+'</td>';
					htmlRow += '</tr>';
				})
				htmlRow += '</td></table>';
				htmlRow += '</tr>';
				table.append(htmlRow);
			})
			// all done

			$(document).find('[data-export-csv]').removeClass('is-inactive');

			table.removeClass('is-inactive');
	}

	// store date input as useable format
	$(document).on('change', '[data-start-date], [data-end-date]', function(e){
		e.stopPropagation();
		let self = $(this);
		let myDate = self.val();
		// convert date to useable format (uses moment.js)
		myDate = moment(myDate);
		// store date in data attr
		self.attr('data-date', myDate);
	})

	// handle click "PROCESS RESULTS" button
	$(document).on('click touchend', '[data-process-results]', function(e){
		e.stopPropagation();
		e.preventDefault();
		exportToArray();
	})

})




// ================== NOTES ON NEXT STEPS ==========================

// To merge students into unique array items:
// For each, if student is in array, add to that student array item, otherwise add new student to array

// To clean any irrelevant tests:
// For each student,
// For each of their results, check if any irrelevancy markers, remove result if marker present.

// To calc pass fail for result:
// For each student,
// For each result, if scored over 50%, append pass to result array, otherwise append fail

// To calc total pass fail for student:
// For each student, var count, var passCount
// For each result, add 1 to count, if pass add 1 to passCount,
// If passCount greater than count / 2, mark student as pass





// ========================== must have TODO ==================================	
	
	// show results = total assessments, total unsubmitted, total passed, total failed,  % passed, % failed, pass / fail (anything else we can do to help understand students?)

	// handle export csv

// ========================== nice to haves ===================================
	// handle search

	// handle sort

	// handle filter

	// API Canva to get data directly