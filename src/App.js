// src/App.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import Login from "./components/Login";
import Routine from "./components/Routine";
import Character from "./components/Character";
import Ranking from "./components/Ranking";
import "./index.css"; // login-background, login-card 등 스타일

// ---------------------------------------
// 1) Google Apps Script 웹앱 URL
// ---------------------------------------
const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbyd7cpGUGtVsNQdDm3jVIV-PVcFK4vvlY4RHMGKKpsqnzZC2FrMZyTOoqNsFAGjsX5z6g/exec";

// ---------------------------------------
// 2) 유틸 함수: 타임스탬프, 쿠키, IP, 디바이스 구하기
// ---------------------------------------
function padValue(value) {
    return value < 10 ? "0" + value : value;
}

function getTimeStamp() {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const seconds = d.getSeconds();
    return `${padValue(year)}-${padValue(month)}-${padValue(day)} ${padValue(
        hours
    )}:${padValue(minutes)}:${padValue(seconds)}`;
}

function getCookieValue(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
}

function setCookieValue(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getUVfromCookie() {
    const hash = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existing = getCookieValue("user");
    if (!existing) {
        setCookieValue("user", hash, 180);
        return hash;
    }
    return existing;
}

let ip = "unknown";

function setIP(json) {
    try {
        ip = json.ip;
        console.log("JSONP 콜백에서 가져온 IP:", ip);
    } catch {
        ip = "unknown";
    }
}
window.setIP = setIP; // 전역에 등록해야 JSONP 콜백이 호출됩니다

function loadIP() {
    console.log("loadIP() 호출됨");
    const script = document.createElement("script");
    script.src = "https://jsonip.com?format=jsonp&callback=setIP";
    script.onerror = () => console.warn("JSONP 스크립트 로드 실패");
    document.head.appendChild(script);
}

function getDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    )
        ? "mobile"
        : "desktop";
}

// ---------------------------------------
// 3) App 컴포넌트
// ---------------------------------------
function App() {
    const [currentUserId, setCurrentUserId] = useState(null);
    const [activeTab, setActiveTab] = useState("routine");
    const [userExp, setUserExp] = useState(0);

    // 3-1) 컴포넌트 마운트 시점: IP 로드 + visitor 테이블에 삽입
    useEffect(() => {
        loadIP(); // JSONP 호출로 ip 업데이트

        const timeoutId = setTimeout(() => {
            const visitorId = getUVfromCookie();
            const landingUrl = window.location.href;
            const referer = document.referrer || "";
            const timestamp = getTimeStamp();
            const utm =
                new URLSearchParams(window.location.search).get("utm") || "";
            const device = getDevice();

            const visitorData = JSON.stringify({
                id: visitorId,
                landingUrl: landingUrl,
                ip: ip,
                referer: referer,
                timestamp: timestamp,
                utm: utm,
                device: device,
            });
            console.log("visitorData:", visitorData);

            // ★ responseType: "text" 지정 ★
            axios
                .get(SCRIPT_URL, {
                    params: {
                        action: "insert",
                        table: "visitors",
                        data: visitorData,
                    },
                    responseType: "text",
                })
                .then((response) => console.log(JSON.stringify(response)))
                .catch((error) => console.log(error));
        }, 1000); // IP가 세팅될 시간을 주기 위해 1초 지연

        return () => clearTimeout(timeoutId);
    }, []);

    // 3-2) 로컬스토리지에 저장된 currentUserId 복원
    useEffect(() => {
        const savedUserId = localStorage.getItem("currentUserId");
        if (savedUserId) {
            setCurrentUserId(savedUserId);
        }
    }, []);

    // 3-3) currentUserId 변경 시, userExpKey 읽어서 userExp 상태에 반영
    useEffect(() => {
        if (!currentUserId) return;
        const userExpKey = `userExp-${currentUserId}`;
        const stored = parseInt(localStorage.getItem(userExpKey) || "0", 10);
        setUserExp(stored);

        const intervalId = setInterval(() => {
            const updated = parseInt(
                localStorage.getItem(userExpKey) || "0",
                10
            );
            setUserExp(updated);
        }, 1000);
        return () => clearInterval(intervalId);
    }, [currentUserId]);

    // 3-4) 로그인 성공 시 호출되는 핸들러
    const handleLoginSuccess = (userId, isNewUser, userName, userPassword) => {
        setCurrentUserId(userId);
        setActiveTab("routine");

        // userExpKey 초기화 (없으면 0으로 세팅)
        const userExpKey = `userExp-${userId}`;
        if (!localStorage.getItem(userExpKey)) {
            localStorage.setItem(userExpKey, "0");
            setUserExp(0);
        }

        // 신규 사용자라면 users 테이블에 INSERT
        if (isNewUser) {
            const visitorId = getUVfromCookie();
            const userData = {
                id: Date.now().toString(), // 고유 ID로 timestamp 사용
                visitorId: visitorId, // 쿠키 기반 ID
                username: userName, // 입력한 사용자 이름
                password: userPassword, // 입력한 비밀번호
            };

            // ★ responseType: "text" 지정 ★
            axios
                .get(SCRIPT_URL, {
                    params: {
                        action: "insert",
                        table: "users",
                        data: JSON.stringify(userData),
                    },
                    responseType: "text",
                })
                .then((res) => {
                    const txt = res.data;
                    if (
                        typeof txt === "string" &&
                        txt.startsWith("undefined(")
                    ) {
                        try {
                            const jsonStr = txt.slice("undefined(".length, -1);
                            const parsed = JSON.parse(jsonStr);
                            console.log("users 저장 성공:", parsed);
                        } catch (e) {
                            console.error("users 응답 파싱 오류:", e, txt);
                        }
                    } else {
                        console.log("users 응답:", txt);
                    }
                })
                .catch((err) => {
                    console.error("users 저장 실패:", err);
                });
        }
    };

    // 3-5) 로그아웃 처리
    const handleLogout = () => {
        localStorage.removeItem("currentUserId");
        setCurrentUserId(null);
        setActiveTab("routine");
        setUserExp(0);
    };

    const getUserName = () => {
        if (!currentUserId) return "";
        return currentUserId.split("__")[0];
    };

    // 3-6) 로그인 상태가 아니라면 로그인 화면만 렌더링
    if (!currentUserId) {
        return (
            <div className="login-background">
                <nav className="navbar navbar-dark bg-dark">
                    <div className="container-fluid">
                        <span className="navbar-brand">
                            FitBuddy Connection
                        </span>
                    </div>
                </nav>
                <div
                    className="d-flex justify-content-center align-items-center"
                    style={{ height: "calc(100vh - 56px)" }}
                >
                    <div className="login-card">
                        <Login onLogin={handleLoginSuccess} />
                    </div>
                </div>
            </div>
        );
    }

    // 3-7) 로그인 상태일 때 메인 화면 렌더링
    return (
        <div>
            {/* 상단 네비게이션바: 브랜드명 + 내 프로틴 + 사용자 이름 + 로그아웃 */}
            <nav className="navbar navbar-dark bg-dark">
                <div className="container-fluid">
                    <span className="navbar-brand">FitBuddy Connection</span>
                    <div className="d-flex align-items-center">
                        <span className="navbar-text text-info me-4">
                            내 프로틴: <strong>{userExp}</strong>
                        </span>
                        <span className="navbar-text text-light me-3">
                            {getUserName()}님
                        </span>
                        <button
                            className="btn btn-outline-light btn-sm"
                            onClick={handleLogout}
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            </nav>

            {/* 콘텐츠 영역 (상단 네비 높이 56px 고려) */}
            <div
                className="container"
                style={{ paddingTop: "60px", paddingBottom: "60px" }}
            >
                {activeTab === "routine" && (
                    <Routine currentUserId={currentUserId} />
                )}
                {activeTab === "character" && (
                    <Character currentUserId={currentUserId} />
                )}
                {activeTab === "ranking" && <Ranking />}
            </div>

            {/* 하단 네비게이션 */}
            <ul className="nav nav-pills nav-justified fixed-bottom bg-light">
                <li className="nav-item">
                    <button
                        className={
                            "nav-link" +
                            (activeTab === "routine" ? " active" : "")
                        }
                        onClick={() => setActiveTab("routine")}
                    >
                        루틴
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={
                            "nav-link" +
                            (activeTab === "character" ? " active" : "")
                        }
                        onClick={() => setActiveTab("character")}
                    >
                        캐릭터
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={
                            "nav-link" +
                            (activeTab === "ranking" ? " active" : "")
                        }
                        onClick={() => setActiveTab("ranking")}
                    >
                        전체 랭킹
                    </button>
                </li>
            </ul>
        </div>
    );
}

export default App;
