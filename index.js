const contractSource = `

payable contract ResturantVote =



  record resturant =

    { creatorAddress : address,

      url            : string,

      name           : string,
      description    : string,
      voteCount      : int }



  record state =

    { resturants      : map(int, resturant),

      resturantsLength : int }



  entrypoint init() =

    { resturants = {},

      resturantsLength = 0 }



  entrypoint getResturant(index : int) : resturant =

  	switch(Map.lookup(index, state.resturants))

	    None    => abort("There was no resturant with this index registered.")

	    Some(x) => x



  stateful entrypoint registerResturant(url' : string, name' : string, description': string) =

    let resturant = { creatorAddress = Call.caller, url = url', name = name',description=description' ,voteCount = 0}

    let index = getResturantsLength() + 1

    put(state{ resturants[index] = resturant, resturantsLength = index })



  entrypoint getResturantsLength() : int =

    state.resturantsLength



  payable stateful entrypoint voteResturant(index : int) =

    let resturant = getResturant(index)

    Chain.spend(resturant.creatorAddress, Call.value)

    let updatedVoteCount = resturant.voteCount + Call.value

    let updatedResturants = state.resturants{ [index].voteCount = updatedVoteCount }

    put(state{ resturants = updatedResturants })

`;



//Address of the meme voting smart contract on the testnet of the aeternity blockchain

const contractAddress = 'ct_BTMaT1V63x6XfEZMnwLesBKpQ5yLBxtZJTVknLMG5ZQgXV9Ta';

//Create variable for client so it can be used in different functions

var client = null;

//Create a new global array for the memes

var resturantArray = [];

//Create a new variable to store the length of the meme globally

var resturantsLength = 0;



function renderResturants() {

  //Order the memes array so that the meme with the most votes is on top

  resturantArray = resturantArray.sort(function(a,b){return b.votes-a.votes})

  //Get the template we created in a block scoped variable

  let template = $('#template').html();

  //Use mustache parse function to speeds up on future uses

  Mustache.parse(template);

  //Create variable with result of render func form template and data

  let rendered = Mustache.render(template, {resturantArray});

  //Use jquery to add the result of the rendering to our html

  $('#resturantBody').html(rendered);

}



//Create a asynchronous read call for our smart contract

async function callStatic(func, args) {

  //Create a new contract instance that we can interact with

  const contract = await client.getContractInstance(contractSource, {contractAddress});

  //Make a call to get data of smart contract func, with specefied arguments

  const calledGet = await contract.call(func, args, {callStatic: true}).catch(e => console.error(e));

  //Make another call to decode the data received in first call

  const decodedGet = await calledGet.decode().catch(e => console.error(e));



  return decodedGet;

}



//Create a asynchronous write call for our smart contract

async function contractCall(func, args, value) {

  const contract = await client.getContractInstance(contractSource, {contractAddress});

  //Make a call to write smart contract func, with aeon value input

  const calledSet = await contract.call(func, args, {amount: value}).catch(e => console.error(e));



  return calledSet;

}



//Execute main function

window.addEventListener('load', async () => {

  //Display the loader animation so the user knows that something is happening

  $("#loader").show();



  //Initialize the Aepp object through aepp-sdk.browser.js, the base app needs to be running.

  client = await Ae.Aepp();



  //First make a call to get to know how may memes have been created and need to be displayed

  //Assign the value of meme length to the global variable

  resturantsLength = await callStatic('getResturantsLength', []);
  console.log("Length Of Restaurant:",resturantsLength)


  //Loop over every meme to get all their relevant information

  for (let i = 1; i <= resturantsLength; i++) {



    //Make the call to the blockchain to get all relevant information on the meme

    const resturant = await callStatic('getResturant', [i]);



    //Create meme object with  info from the call and push into the array with all memes

    resturantArray.push({

      creatorName: resturant.name,

      memeUrl: resturant.url,

      index: i,

      votes: resturant.voteCount,

      description: resturant.description,

    })

  }



  //Display updated memes

  renderResturants();



  //Hide loader animation

  $("#loader").hide();

});



//If someone clicks to vote on a meme, get the input and execute the voteCall

jQuery("#resturantBody").on("click", ".voteBtn", async function(event){

  $("#loader").show();

  //Create two new let block scoped variables, value for the vote input and

  //index to get the index of the meme on which the user wants to vote

  let value = $(this).siblings('input').val(),

      index = event.target.id;



  //Promise to execute execute call for the vote meme function with let values

  await contractCall('voteResturant', [index], value);



  //Hide the loading animation after async calls return a value

  const foundIndex = resturantArray.findIndex(resturant => resturant.index == event.target.id);

  //console.log(foundIndex);

  resturantArray[foundIndex].votes += parseInt(value, 10);



  renderResturants();

  $("#loader").hide();

});



//If someone clicks to register a meme, get the input and execute the registerCall

$('#registerBtn').click(async function(){

  $("#loader").show();

  //Create two new let variables which get the values from the input fields

  const name = ($('#regName').val()),

        url = ($('#regUrl').val()),

          description= ($('#regDescription').val());



  //Make the contract call to register the meme with the newly passed values

  await contractCall('registerResturant', [url, name, description], 0);



  //Add the new created memeobject to our memearray

  resturantArray.push({

    creatorName: name,

    memeUrl: url,

    index: resturantArray.length+1,

    votes: 0,

    description: description,

  })



  renderResturants();

  $("#loader").hide();

});
