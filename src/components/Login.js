// src/components/Login.js
import React, { useState, useEffect } from "react";
import axios from "axios";

// ---------------------------------------
// Google Apps Script 웹앱 URL
// (반드시 실제로 배포된 웹앱 URL을 넣어주세요)
// ---------------------------------------
const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwS5isKVX48cuAkafURvGgLDh2AIpZhHWTBxob_mHVsKQ14f53BwE4jCOGjg6_8VGjBfA/exec";

// ---------------------------------------
// 유틸 함수: 쿠키, IP, 디바이스, 타임스탬프
// ---------------------------------------
function padValue(v) {
    return v < 10 ? "0" + v : v;
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
    document.cookie = `${name}=${value || ""}${expires}; path=/`;
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
    document.head.appendChild(script);
}

// ---------------------------------------
// 캐릭터 목록: ID만 필요 (이름/이미지는 Character.js 에서 사용)
// ---------------------------------------
const CHARACTER_LIST = ["daehyunggeun", "daetuaesadu", "bokjikgeun"];

export default function Login({ onLogin }) {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [statusMsg, setStatusMsg] = useState("");

    // <— 새로 추가: 로딩 상태 플래그
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // 1) 컴포넌트 마운트 시점: IP 가져오기 + visitors 테이블에 방문 기록 삽입
    useEffect(() => {
        loadIP();

        // IP가 채워질 시간을 약간 두고(예: 1초) visitors 테이블에 정보 저장
        const timeoutId = setTimeout(() => {
            const visitorId = getUVfromCookie();
            const landingUrl = window.location.href;
            const referer = document.referrer || "";
            const timestamp = getTimeStamp();
            const utm =
                new URLSearchParams(window.location.search).get("utm") || "";
            const device = getDevice();

            const visitorData = {
                id: visitorId, // visitor 고유 ID (쿠키 기반)
                landingUrl: landingUrl,
                ip: ip,
                referer: referer,
                timestamp: timestamp,
                utm: utm,
                device: device,
            };

            axios
                .get(SCRIPT_URL, {
                    params: {
                        action: "insert",
                        table: "visitors",
                        data: JSON.stringify(visitorData),
                    },
                    responseType: "text",
                })
                .then((res) => {
                    console.log("[Login] visitors 삽입 raw:", res.data);
                })
                .catch((err) => {
                    console.error("[Login] visitors 삽입 오류:", err);
                });
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, []);

    // JSONP 래퍼 파싱 함수 (callback 혹은 undefined 래퍼 제거)
    const parseJsonpResponse = (txt) => {
        if (typeof txt !== "string") return txt;
        const trimmed = txt.trim();
        const firstParen = trimmed.indexOf("(");
        const lastParen = trimmed.lastIndexOf(")");
        if (firstParen !== -1 && lastParen !== -1 && lastParen > firstParen) {
            const jsonStr = trimmed.substring(firstParen + 1, lastParen);
            return JSON.parse(jsonStr);
        }
        return JSON.parse(trimmed);
    };

    // 2) 로그인 / 신규 가입 처리
    const handleLogin = async () => {
        const trimmedName = name.trim();
        const trimmedPw = password.trim();

        if (!trimmedName || !trimmedPw) {
            alert("이름과 비밀번호를 모두 입력해주세요.");
            return;
        }

        // 1) 로딩 시작
        setIsLoggingIn(true);
        setStatusMsg("");

        try {
            // 2-1) users 테이블 전체를 읽어옴
            const res = await axios.get(SCRIPT_URL, {
                params: {
                    action: "read",
                    table: "users",
                    callback: "JSON_CALLBACK",
                },
                responseType: "text",
            });
            console.log("[Login] users read raw:", res.data);

            let allUsers = [];
            const txt = res.data;

            // JSONP 여부에 따라 파싱
            if (typeof txt === "string" && txt.startsWith("undefined(")) {
                const jsonStr = txt.slice("undefined(".length, -1);
                const parsed = JSON.parse(jsonStr);
                allUsers = parsed.success ? parsed.data : [];
            } else if (txt.startsWith("JSON_CALLBACK(")) {
                const jsonStr = txt.slice("JSON_CALLBACK(".length, -1);
                const parsed = JSON.parse(jsonStr);
                allUsers = parsed.success ? parsed.data : [];
            } else {
                const parsed = JSON.parse(txt);
                allUsers = parsed.success ? parsed.data : [];
            }

            // 2-2) 스프레드시트에서 가져온 username/password와 비교
            const found = allUsers.find((row) => {
                const serverName = (row.username || "").toString().trim();
                const serverPw = (row.password || "").toString().trim();
                return serverName === trimmedName && serverPw === trimmedPw;
            });

            if (found) {
                // ── 기존 사용자 로그인 ──
                const serverUserId = found.id.toString();
                console.log(
                    "[Login] 기존 사용자 로그인, userId:",
                    serverUserId
                );
                localStorage.setItem("currentUserId", serverUserId);
                setStatusMsg(`${trimmedName}님, 환영합니다!`);
                onLogin(serverUserId, false, trimmedName, trimmedPw);
            } else {
                // ── 신규 사용자 가입 처리 ──
                const timestampId = Date.now().toString();
                const visitorId = getUVfromCookie();

                const newUserData = {
                    id: timestampId,
                    visitorId: visitorId,
                    username: trimmedName,
                    password: trimmedPw,
                    protein: 0,
                };

                console.log("[Login] 신규 삽입 payload:", newUserData);
                const res2 = await axios.get(SCRIPT_URL, {
                    params: {
                        action: "insert",
                        table: "users",
                        data: JSON.stringify(newUserData),
                        callback: "JSON_CALLBACK",
                    },
                    responseType: "text",
                });
                console.log("[Login] users insert raw:", res2.data);

                let parsed2;
                const txt2 = res2.data;
                if (typeof txt2 === "string" && txt2.startsWith("undefined(")) {
                    const body = txt2.slice("undefined(".length, -1);
                    parsed2 = JSON.parse(body);
                } else if (txt2.startsWith("JSON_CALLBACK(")) {
                    const body = txt2.slice("JSON_CALLBACK(".length, -1);
                    parsed2 = JSON.parse(body);
                } else {
                    parsed2 = JSON.parse(txt2);
                }

                if (parsed2.success) {
                    console.log("[Login] users 신규 삽입 성공:", parsed2.data);

                    // 2-3) 신규 유저 기본 캐릭터 3개도 user_characters 테이블에 추가
                    CHARACTER_LIST.forEach(async (charId) => {
                        const charRow = {
                            userid: timestampId,
                            charId: charId,
                            level: 1,
                        };
                        try {
                            const res3 = await axios.get(SCRIPT_URL, {
                                params: {
                                    action: "insert",
                                    table: "user_characters",
                                    data: JSON.stringify(charRow),
                                    callback: "JSON_CALLBACK",
                                },
                                responseType: "text",
                            });
                            console.log(
                                `[Login] user_characters 기본 삽입 성공 (${charId}):`,
                                res3.data
                            );
                        } catch (err3) {
                            console.error(
                                `[Login] user_characters 기본 삽입 오류 (${charId}):`,
                                err3
                            );
                        }
                    });

                    // 2-4) localStorage 저장 및 상위 컴포넌트 콜백
                    localStorage.setItem("currentUserId", timestampId);
                    setStatusMsg(`${trimmedName}님, 가입되었습니다!`);
                    onLogin(timestampId, true, trimmedName, trimmedPw);
                } else {
                    console.warn(
                        "[Login] users 신규 삽입 실패:",
                        parsed2.data.error
                    );
                    alert("신규 사용자 등록에 실패했습니다.");
                }
            }
        } catch (err) {
            console.error("[Login] users 조회/삽입 오류:", err);
            alert("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            // 3) 로딩 끝
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="text-center">
            <h2 className="fw-bold">비회원 로그인</h2>
            <input
                type="text"
                className="form-control w-50 mx-auto mb-2"
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoggingIn}
            />
            <input
                type="password"
                className="form-control w-50 mx-auto mb-3"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
            />
            <button
                className="btn btn-primary"
                onClick={handleLogin}
                disabled={isLoggingIn}
            >
                {isLoggingIn ? "로그인 중…" : "로그인 / 회원가입"}
            </button>
            {statusMsg && <p className="mt-2 text-success">{statusMsg}</p>}

            {/* ——— 전체 화면 오버레이 + 중앙 스피너 ——— */}
            {isLoggingIn && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        backgroundColor: "rgba(0,0,0,0.3)",
                        zIndex: 9999,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <div className="spinner-border text-light" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
