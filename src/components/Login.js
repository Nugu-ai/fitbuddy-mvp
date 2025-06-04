// src/components/Login.js
import React, { useState, useEffect } from "react";
import axios from "axios";

// ---------------------------------------
// 1) Google Apps Script 웹앱 URL
// ---------------------------------------
const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbyd7cpGUGtVsNQdDm3jVIV-PVcFK4vvlY4RHMGKKpsqnzZC2FrMZyTOoqNsFAGjsX5z6g/exec";

// ---------------------------------------
// 2) 유틸 함수: 쿠키, IP, 디바이스, 타임스탬프
// ---------------------------------------
function padValue(value) {
    return value < 10 ? "0" + value : value;
}
function getTimeStamp() {
    const d = new Date();
    return `${padValue(d.getFullYear())}-${padValue(
        d.getMonth() + 1
    )}-${padValue(d.getDate())} ${padValue(d.getHours())}:${padValue(
        d.getMinutes()
    )}:${padValue(d.getSeconds())}`;
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

function getDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    )
        ? "mobile"
        : "desktop";
}

let ip = "unknown";
function setIP(json) {
    try {
        ip = json.ip;
    } catch {
        ip = "unknown";
    }
}
window.setIP = setIP;
function loadIP() {
    const script = document.createElement("script");
    script.src = "https://jsonip.com?format=jsonp&callback=setIP";
    script.onerror = () => console.warn("JSONP 스크립트 로드 실패");
    document.head.appendChild(script);
}

export default function Login({ onLogin }) {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [statusMsg, setStatusMsg] = useState("");

    // 컴포넌트 마운트 시 IP 가져오기
    useEffect(() => {
        loadIP();
    }, []);

    // 이름+비밀번호를 합쳐서 userId로 사용 (로컬스토리지 키)
    const makeUserId = (n, p) => `${n}__${p}`;

    const handleLogin = () => {
        if (!name.trim() || !password.trim()) {
            alert("이름과 비밀번호를 모두 입력해주세요.");
            return;
        }
        const userId = makeUserId(name.trim(), password.trim());

        // Google Sheets의 users 테이블에서 username/password 일치 여부 조회
        axios
            .get(SCRIPT_URL, {
                params: {
                    action: "read",
                    table: "users",
                },
                responseType: "text", // JSONP 응답을 문자열로 받기 위해
            })
            .then((res) => {
                const txt = res.data;
                console.log("원본 users 응답 텍스트:", txt);

                let allUsers = [];
                // "undefined({...})" 형태 처리
                if (typeof txt === "string" && txt.startsWith("undefined(")) {
                    try {
                        const jsonStr = txt.slice("undefined(".length, -1);
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.success && Array.isArray(parsed.data)) {
                            allUsers = parsed.data;
                        } else {
                            console.error(
                                "users 조회 실패:",
                                parsed.data.error
                            );
                        }
                    } catch (e) {
                        console.error("users JSON 파싱 오류:", e, txt);
                    }
                } else {
                    // 혹시 콜백 없이 순수 JSON이 온 경우
                    try {
                        const parsed = JSON.parse(txt);
                        if (parsed.success && Array.isArray(parsed.data)) {
                            allUsers = parsed.data;
                        } else {
                            console.error(
                                "users 조회 실패:",
                                parsed.data.error
                            );
                        }
                    } catch (e) {
                        console.error("users 응답 파싱 실패:", e, txt);
                    }
                }

                // allUsers 배열에서 username/password 일치 여부 확인
                const found = allUsers.find(
                    (row) =>
                        row.username === name.trim() &&
                        row.password === password.trim()
                );

                if (found) {
                    // 기존 사용자
                    localStorage.setItem("currentUserId", userId);
                    setStatusMsg(`${name.trim()}님, 환영합니다!`);
                    onLogin(userId, false, name.trim(), password.trim());
                } else {
                    // 신규 사용자: 로컬스토리지에도 저장
                    const usersLS = JSON.parse(
                        localStorage.getItem("users") || "{}"
                    );
                    let isNewLocal = false;
                    if (!usersLS[userId]) {
                        usersLS[userId] = true;
                        localStorage.setItem("users", JSON.stringify(usersLS));
                        isNewLocal = true;
                    }
                    localStorage.setItem("currentUserId", userId);
                    setStatusMsg(`${name.trim()}님, 환영합니다!`);

                    // App.js로 isNewUser=true 전달
                    onLogin(userId, true, name.trim(), password.trim());
                }
            })
            .catch((err) => {
                console.error("users 테이블 조회 실패:", err);
                alert(
                    "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
                );
            });
    };

    return (
        <div className="text-center">
            <h2 className="fw-bold">간단 로그인</h2>
            <input
                type="text"
                className="form-control w-50 mx-auto mb-2"
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <input
                type="password"
                className="form-control w-50 mx-auto mb-3"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleLogin}>
                로그인 / 신규 사용자 등록
            </button>
            {statusMsg && <p className="mt-2 text-success">{statusMsg}</p>}
        </div>
    );
}
