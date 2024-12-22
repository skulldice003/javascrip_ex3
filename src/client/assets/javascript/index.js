let store = {
	track_id: undefined,
	player_id: undefined,
	race_id: undefined,
}

document.addEventListener("DOMContentLoaded", function() {
	onPageLoad()
	setupClickHandlers()
})
async function onPageLoad() {
	try {
		getTracks()
			.then(tracks => {
				const html = renderTrackCards(tracks)
				renderAt('#tracks', html)
			})
		getRacers()
			.then((racers) => {
				const html = renderRacerCars(racers)
				renderAt('#racers', html)
			})
	} catch(error) {
		console.log("Problem getting tracks and racers ::", error.message)
		console.error(error)
	}
}

function setupClickHandlers() {
	document.addEventListener('click', function(event) {
		const { target } = event

		if (target.matches('.card.track')) {
			handleSelectTrack(target)
		}

		if (target.matches('.card.podracer')) {
			handleSelectPodRacer(target)
		}

		if (target.matches('#submit-create-race')) {
			event.preventDefault()
	
			handleCreateRace()
		}

		if (target.matches('#gas-peddle')) {
			handleAccelerate(target)
		}

	}, false)
}

async function delay(ms) {
	try {
		return await new Promise(resolve => setTimeout(resolve, ms));
	} catch(error) {
		console.log("an error shouldn't be possible here")
		console.log(error)
	}
}

async function handleCreateRace() {
  const playerId = store.player_id
  const trackId = store.track_id
	console.log('store is: ', store)
  if (!playerId || !trackId || !store.race_id) {
    renderAt('#error', '<h2 class="error">Please select Track and Race</h2>')
    return
  }
  try {
    const race = await createRace(playerId, trackId)
		console.log('created race: ', race);
    store.race_id = race.ID

    renderAt('#race', renderRaceStartView(race.Track, race.Cars))
  } catch (error) {
    renderAt('#error', `<h2 class="error">${error.message}</h2>`)
    console.log(error)
    return
  }

		await  runCountdown()
	console.log("store.race_id in run countdown", store.race_id)
	const startResults = await startRace(store.race_id - 1)
	if (startResults.error) {
    renderAt('#race', renderServerError(startResults))
    return
  }
	await runRace(store.race_id - 1)
}

async function runRace(raceID) {
	return new Promise(resolve => {
		const racerInterval = setInterval(async ()=> {
			const getRaceResponse = await getRace(raceID)
				.catch((error) => console.log("getRace error ", error));

			if(getRaceResponse.status == 'in-progress') {
				renderAt('#leaderBoard', raceProgress(getRaceResponse.positions))
			} else 
			if(getRaceResponse.status == 'finished') {
				clearInterval(racerInterval)
				renderAt('#race', resultsView(getRaceResponse.positions)) 
				resolve(getRaceResponse);
			}
			
		},500)
	}).catch(error => console.log(error))
}

async function runCountdown() {
	try {
		await delay(1000)
		let timer = 3

		return new Promise(resolve => {
		countIntervalSecond = setInterval(() => {
			document.getElementById('big-numbers').innerHTML = --timer
			if(timer === 0) {
				clearInterval(countIntervalSecond)
				resolve()
			}
		},1000)
		})		
	} catch(error) {
		console.log(error);
	}
}

function handleSelectPodRacer(target) {
	console.log("selected a pod", target.id)

	const selected = document.querySelector('#racers .selected')
	if(selected) {
		selected.classList.remove('selected')
	}

	target.classList.add('selected')

	store.race_id = target.id
}

function handleSelectTrack(target) {
	console.log("selected a track", target.id)

	const selected = document.querySelector('#tracks .selected')
	if(selected) {
		selected.classList.remove('selected')
	}

	target.classList.add('selected')

	store.track_id = target.id
	store.player_id = +target.id
}

function handleAccelerate() {
	console.log("accelerate button clicked")
	accelerate(store.race_id-1)
}

// HTML VIEWS

function renderRacerCars(racers) {
	if (!racers.length) {
		return `
			<h4>Loading Racers...</4>
		`
	}

	const results = racers.map(renderRacerCard).join('')

	return `
		<ul id="racers">
			${results}
		</ul>
	`
}

function renderRacerCard(racer) {
	const { id, driver_name, top_speed, acceleration, handling } = racer

	return `
		<li class="card podracer" id="${id}">
			<h3>${driver_name}</h3>
			<p>${top_speed} km/h</p>
			<p>${acceleration} acc</p>
			<p>${handling} handl</p>
		</li>
	`
}

function renderTrackCards(tracks) {
	if (!tracks.length) {
		return `
			<h4>Loading Tracks...</4>
		`
	}

	const results = tracks.map(renderTrackCard).join('')

	return `
		<ul id="tracks">
			${results}
		</ul>
	`
}

function renderTrackCard(track) {
	const { id, name } = track

	return `
		<li id="${id}" class="card track">
			<h3>${name}</h3>
		</li>
	`
}

function renderCountdown(count) {
	return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`
}

function renderRaceStartView(track, racers) {
	return `
		<header>
			<h1>Race: ${track.name}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(3)}
			</section>

			<section id="accelerate">
				<h3>Directions</h3>
				<p>Click the button as fast as you can to make your racer go faster!</p>
				<button id="gas-peddle">
					<h2>Accelerate!</h2>
				</button>
			</section>
		</main>
		<footer class="footer">
        <div class="footer-text">
            &copy; UdaciRacer Simulation Game - Gabriela Bozbici 
        </div>
    </footer>
	`
}

function resultsView(positions) {
	positions.sort((a, b) => (a.final_position > b.final_position) ? 1 : -1)

	return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main>
			${raceProgress(positions)}
		<div class="restart">
			<a href="/race" class="reStartRace">Start a new race</a>
		</div>
		</main>
	`
}

function raceProgress(positions) {
	const userPlayer = positions.find(e => e.id === store.player_id)
	userPlayer.driver_name += " (you)"

	positions = positions.sort((a, b) => (a.segment > b.segment) ? -1 : 1)
	let count = 1

	const results = positions.map(p => {
		return `
			<tr>
				<td>
					<h3>${count++}. ${p.driver_name}</h3>
				</td>
			</tr>
		`
	})

	return `
		<main>
			<div class="board">
				<h3>Leaderboard</h3>
			</div>
			<section id="leaderBoard">
				${results}
			</section>
		</main>
	`
}

function renderAt(element, html) {
	const node = document.querySelector(element)

	node.innerHTML = html
}

// API CALLS
const SERVER = 'http://localhost:3001'

function defaultFetchOpts() {
	return {
		mode: 'cors',
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin' : SERVER,
		},
	}
}

function startRace(id) {
	return fetch(`${SERVER}/api/races/${id}/start`, {
		method: 'POST',
		...defaultFetchOpts(),
	})
	.catch(err => console.log("Problem with getRace request::", err))
}

function accelerate(id) {
	return fetch(`${SERVER}/api/races/${id}/accelerate`,{
		method: 'POST'
	})
	.catch(err => console.log('Problem with createRace request::', err))
}

function getRacers() {
	return fetch(`${SERVER}/api/cars`, { ...defaultFetchOpts() })
	.then(response => {
		return response.json()
	})
	.catch(err => ({error: true, message: err.message}))
}

function getRace(id) {
	return fetch(`${SERVER}/api/races/${id}`)
	.then(resp => resp.json())
	.catch(err => ({error: true, message: err.message}))
}

function createRace(player_id, track_id) {
	player_id = parseInt(player_id)
	track_id = parseInt(track_id)
	const body = { player_id, track_id }
	
	return fetch(`${SERVER}/api/races`, {
		method: 'POST',
		...defaultFetchOpts(),
		dataType: 'jsonp',
		body: JSON.stringify(body)
	})
	.then(res => res.json())
	.catch(err => console.log("Problem with createRace request::", err))
}

function getTracks() {
	return fetch(`${SERVER}/api/tracks`)
	.then((response) => {
		return response.json()
	})
	.catch(err => ({ error: true, message: err.message }))
}