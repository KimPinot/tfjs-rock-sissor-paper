import React, {useEffect, useRef, useState} from 'react'
import * as tmImage from '@teachablemachine/image'
import '@tensorflow/tfjs'
import Head from "next/head";

const URL = "https://teachablemachine.withgoogle.com/models/7toSukupP";

function Choice({onChoice, type, text}) {
  return (
      <li>
        <button onClick={() => onChoice(type)}>{text}</button>
      </li>
  )
}

function Result({type}) {
  const res2Text = (resType) => {
    switch (resType) {
      case 0 :
        return '비겼습니다.'
      case 1 :
        return '졌습니다.'
      case 2 :
        return '이겼습니다.'
      default :
        console.error('결과 출력 과정에서 오류가 발생했습니다.')
        return '오류가 발생했습니다.'
    }
  }
  
  return (
      <h2>
        {type !== null ? `이번 게임에서 ${res2Text(type)}` : null}
      </h2>
  )
}

const webCamInit = () => new Promise((async (resolve, reject) => {
  try {
    const webcam = new tmImage.Webcam(640, 480, true);
    
    await webcam.setup()
    await webcam.play()
    
    webcam.canvas.id = "canvas"
    webcam.canvas.onload = () => console.log('loaded.')
    
    if (!document.getElementById('canvas')) {
      console.debug('[시스템] 웹캠 엘리먼트가 추가 되었습니다.')
  
      document
          .getElementById('webcam')
          .appendChild(webcam.canvas)
    }
    
    resolve(webcam)
    
  } catch (e) {
    alert('웹캠을 사용할 수 없거나, 웹캠의 권한을 차단하셨습니다.\n권한을 확인하시고, 다시 시도해보세요!')
    console.error('[오류] 현재 웹캠을 사용할 수 없습니다.')
    reject(e)
  }
}))

const modelInit = () => new Promise(async (resolve, reject) => {
  try {
    const modelURL = `${URL}/model.json`
    const metaURL = `${URL}/metadata.json`
    
    const model = await tmImage.load(modelURL, metaURL)
    
    resolve(model)
  } catch (e) {
    reject(e)
  }
})

const detectFromVideoFrame = (model, webcam, updateState) => {
  const initFps = 30
  frameRecursion(initFps)
  
  async function predict() {
    return await model.predict(webcam.canvas);
  }
  
  async function frameRecursion(count) {
    if (count < 0) {
      count = initFps
    }
    
    if (count === 0) {
      updateState(await predict())
    }
    
    webcam.update()
    
    requestAnimationFrame(async () => {
      frameRecursion(count - 1)
    })
  }
}

// 가장 가까운 값 찾기
const getNearPos = (res) => new Promise((resolve, reject) => {
  let near = {
    className: "",
    probability: 0
  }
  
  if (!res) {
    reject()
  }
  
  res.forEach(pos => {
    if (pos.probability > near.probability) {
      near = pos;
    }
  })
  
  resolve(near)
})

export default function Home() {
  // 가위 : 0 / 바위 : 1 / 보 : 2
  const [usrChoice, setUsrChoice] = useState(null)
  const [botChoice, setBotChoice] = useState(null)
  
  // 승리 체크
  const [isWin, setIsWin] = useState(null)
  
  const [isStart, setIsStart] = useState(false)
  const [isInGame, setIsInGame] = useState(false)
  
  const [leftTime, setLeftTime] = useState(0)
  
  const [isAfk, setIsAfk] = useState(false)
  
  const [isWebCamLoaded, setIsWebCamLoaded] = useState(false)
  
  const [result, setResult] = useState([])
  const resRef = useRef(null)
  
  // 남은 시간 console.debug 로 띄우기
  useEffect(() => {
    {
      leftTime ? console.debug(`[시스템] 타이머의 남은 시간 : ${leftTime}`) : null
    }
  }, [leftTime])
  
  resRef.current = result
  
  useEffect(() => {
    // getNearPos(result)
    //     .then(res => console.log(res))
  }, [result])
  
  useEffect(() => {
    Promise.all([modelInit(), webCamInit()])
        .then(values => {
          setIsWebCamLoaded(true)
          detectFromVideoFrame(values[0], values[1], setResult)
        })
        .catch(err => {
          console.error(err)
        })
  }, [])
  
  useEffect(() => {
    if (isInGame) gameStart()
  }, [isInGame])
  
  const choice2Type = (choice) => {
    switch (choice) {
      case 'sissor' :
        return 0
      case 'rock' :
        return 1
      case 'paper' :
        return 2
      default :
        console.error('[오류] 선택 변환 과정에서 오류가 발생했습니다.')
        return -1
    }
  }
  
  // 입력한 타입 => 일반 텍스트
  const type2Choice = (type) => {
    switch (type) {
      case 0 :
        return '가위'
      case 1 :
        return '바위'
      case 2 :
        return '보'
      default :
        console.error('[오류] 선택 출력 과정에서 오류가 발생했습니다.')
        return '오류'
    }
  }
  
  // 승부 처리 : 유저 승리
  function usrWin() {
    console.debug('[결과] 유저 승리')
    setIsWin(2)
    setIsInGame(false)
  }
  
  // 승부 처리 : 유저 패
  function botWin() {
    console.debug('[결과] 유저 패배')
    setIsWin(1)
    setIsInGame(false)
  }
  
  // 승부 처리 : 무승부
  function draw() {
    console.debug('[결과] 무승부')
    setIsWin(0)
    setIsInGame(false)
  }
  
  // 유저의 선택
  const handleChoice = (usrChoice) => {
    console.debug(`[사용자 클릭] 유저의 선택 : ${type2Choice(usrChoice)}`)
    setUsrChoice(usrChoice)
    
    const botChoice = Math.floor((Math.random() * (2 + 1)));
    console.debug(`[시스템 선택] 봇의 선택 : ${type2Choice(botChoice)}`)
    setBotChoice(botChoice)
    
    // 결과 처리
    const choiceGap = usrChoice - botChoice;
    switch (Math.abs(choiceGap)) {
      case 0 :
        draw()
        break;
      case 1 :
        // 양수 : 승리 / 음수 : 패배
        Math.sign(choiceGap) === 1
            ? usrWin()
            : botWin()
        break;
      case 2 :
        // 양수 : 패배 / 음수 : 승리
        Math.sign(choiceGap) === -1
            ? usrWin()
            : botWin()
        break;
      default :
        setIsWin(-1)
    }
  }
  
  // 카운트 함수
  const count = (time) => new Promise(((resolve) => {
    setLeftTime(time)
    
    let timer = setInterval(() => {
      setLeftTime(prevState => prevState - 1)
    }, 1000);
    
    setTimeout(() => {
      clearInterval(timer)
      console.debug(`[타이머 종료] ${time} 초 이후의 타이머가 종료되었습니다.`)
      resolve(true)
    }, time * 1000)
  }))
  
  // 이전 state
  const usrChoiceRef = useRef()
  usrChoiceRef.current = usrChoice
  
  // 잠수 패배
  const afkLose = () => {
    console.debug('[결과] 잠수로 인한 유저 패배')
    setIsAfk(true)
    botWin()
  }
  
  // 게임 시작
  const gameStart = () => {
    setIsInGame(true)
    
    count(10)
        // 선택 버튼 출력
        .then(() => {
          console.debug('[시스템 표시] 선택 버튼 출력')
          setUsrChoice(-1);
          
          // 안내면 진거...
          count(7)
              .then(async () => {
                const pos = await getNearPos(resRef.current)
                console.log(pos.className, Math.round(pos.probability))
                
                if (Math.round(pos.probability) === 1) {
                  handleChoice(choice2Type(pos.className))
                }
                
                count(3)
                    .then(() => {
                      if (usrChoiceRef.current === -1) {
                        afkLose()
                      }
                    })
              })
        })
  }
  
  // 리셋
  const reset = () => {
    setUsrChoice(null)
    setBotChoice(null)
    
    setIsAfk(false)
    setIsWin(null)
    
    setIsInGame(true)
  }
  
  // 시작
  const start = () => {
    console.debug('[사용자 클릭] 시작 버튼 클릭');
    setIsStart(true);
    setIsInGame(true)
  }
  
  // 안 내면 진 거 가위 바위 보!
  const readyText = ['안 내면 진 거 가위 바위 보!!!', '안 내면 진 거 가위 바위', '안 내면 진 거 가위', '안 내면 진 거', '안 내면 진', '안 내면', '안'];
  
  return (
      <>
        <Head>
          <title>텐서플로우로 하는 가위 바위 보</title>
        </Head>
        
        <div id="webcam" style={{width: '100%'}}/>
        
        {isStart ? (
                <>
                  {!isWebCamLoaded ? (
                      <div>
                        <h1>게임을 준비하는 중입니다...</h1>
                      </div>
                  ) : null}
                  
                  {!isWin && leftTime > 0 && !usrChoice ? (
                      <div>
                        <h1>준비하세요!</h1>
                        <h3>{leftTime} 초 뒤 게임이 시작됩니다!</h3>
                      </div>
                  ) : null}
                  
                  <div>
                    {usrChoice !== -1 && usrChoice ? <h1>당신의 선택 : {type2Choice(usrChoice)}</h1> : null}
                    {botChoice !== -1 && botChoice ? <h1>컴퓨터의 선택 : {type2Choice(botChoice)}</h1> : null}
                    {isAfk && usrChoice === -1 ? <h1>아무것도 내지 않았습니다.</h1> : null}
                    <Result type={isWin}/>
                  </div>
                  
                  {!isWin && leftTime > 0 && usrChoice === -1 ? (
                      <h3>
                        {readyText[leftTime - 1]}
                      </h3>
                  ) : null}
                  
                  {!isWin && leftTime > 0 && usrChoice === -1 ? <ul>
                    {['가위', '바위', '보']
                        .map((_i, i) => (
                            <Choice
                                key={i}
                                onChoice={handleChoice}
                                type={i}
                                text={_i}
                            />
                        ))}
                  </ul> : null}
                  
                  {isWin !== null ? <button onClick={reset}>다시하기</button> : null}
                </>
            )
            : (
                <div>
                  <h1>가위바위보 게임</h1>
                  
                  <button onClick={start}>시작하기</button>
                </div>
            )}
      </>
  )
  
}
