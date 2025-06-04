// src/components/Character.js
import React, { useState, useEffect } from "react";

// 미리 정의된 캐릭터 목록 (ID, 이름, 이미지 경로)
const CHARACTER_LIST = [
    { id: "daehonggeun", name: "대홍근", img: "/img/character_stage1.png" },
    { id: "daeheehaadu", name: "대희하두", img: "/img/character_stage2.png" },
    { id: "ildungsin", name: "일등신", img: "/img/character_stage3.png" },
    { id: "pulgogi", name: "불고기", img: "/img/character_stage4.png" },
    { id: "galmegi", name: "갈메기", img: "/img/character_stage5.png" },
    { id: "wangtteok", name: "왕떡", img: "/img/character_stage6.png" },
];

export default function Character({ currentUserId }) {
    // 현재 선택된 캐릭터 ID (기본값으로 첫 번째 캐릭터)
    const [selectedCharId, setSelectedCharId] = useState(CHARACTER_LIST[0].id);
    // { [charId]: exp, ... }
    const [charExpMap, setCharExpMap] = useState({});
    // { [charId]: level, ... }
    const [charLevelMap, setCharLevelMap] = useState({});

    // 경험치 → 레벨 변환 공식. 레벨 n으로 가기 위한 총 EXP = 100 * [n * (n - 1) / 2]
    const calculateLevel = (expValue) => {
        const x = expValue / 100;
        const lvl = Math.floor((1 + Math.sqrt(1 + 8 * x)) / 2);
        return lvl < 1 ? 1 : lvl;
    };

    // “다음 레벨 달성에 필요한 총 누적 경험치”를 계산
    // 예: 현재 레벨이 3이면, 4레벨 달성에 필요한 총 경험치 = 100 * (4 * 3 / 2) = 600
    const getTotalExpForNextLevel = (currentLevel) => {
        const next = currentLevel + 1;
        return 100 * ((next * (next - 1)) / 2);
    };

    // localStorage에서 “exp-<userId>-<charId>” 읽어서 state에 반영
    const loadAllCharData = () => {
        if (!currentUserId) {
            setCharExpMap({});
            setCharLevelMap({});
            return;
        }
        const expMap = {};
        const levelMap = {};

        CHARACTER_LIST.forEach(({ id }) => {
            const key = `exp-${currentUserId}-${id}`;
            const storedExp = parseInt(localStorage.getItem(key) || "0", 10);
            expMap[id] = storedExp;
            levelMap[id] = calculateLevel(storedExp);
        });

        setCharExpMap(expMap);
        setCharLevelMap(levelMap);
    };

    // 마운트될 때와 currentUserId가 바뀔 때마다 데이터 로드
    useEffect(() => {
        loadAllCharData();
    }, [currentUserId]);

    // 선택된 캐릭터에 경험치를 추가 (+10 고정이 아니라 amount로 유연하게)
    const addExpToSelected = (amount = 10) => {
        if (!currentUserId) return;
        const charId = selectedCharId;
        const key = `exp-${currentUserId}-${charId}`;
        const prevExp = parseInt(localStorage.getItem(key) || "0", 10);
        const prevLevel = calculateLevel(prevExp);
        const totalForNext = getTotalExpForNextLevel(prevLevel);
        const expNeeded = totalForNext - prevExp;

        let nextExp;
        let nextLevel;

        if (amount >= expNeeded) {
            // 남은 경험치만큼 채워서 레벨업 → 경험치 초기화(0)
            nextExp = 0;
            nextLevel = prevLevel + 1;
        } else {
            // 아직 레벨업되지 않는 상황: prevExp + amount
            nextExp = prevExp + amount;
            nextLevel = calculateLevel(nextExp);
        }

        // localStorage에 저장
        localStorage.setItem(key, nextExp);
        // state 업데이트
        setCharExpMap((prev) => ({
            ...prev,
            [charId]: nextExp,
        }));
        setCharLevelMap((prev) => ({
            ...prev,
            [charId]: nextLevel,
        }));
    };

    // 현재 선택된 캐릭터 정보
    const selectedCharInfo = CHARACTER_LIST.find(
        (c) => c.id === selectedCharId
    );
    // 선택된 캐릭터의 exp, level
    const currentExp = charExpMap[selectedCharId] || 0;
    const currentLevel = charLevelMap[selectedCharId] || 1;

    return (
        <div className="text-center">
            {/** ================================== 
          1) 상단: 선택된 캐릭터 큰 뷰
      ==================================== **/}
            <div className="mb-4">
                <img
                    src={selectedCharInfo.img}
                    alt={selectedCharInfo.name}
                    className="img-fluid"
                    style={{ width: "200px" }}
                />
                <h3 className="mt-2">{selectedCharInfo.name}</h3>
                <p className="h5 mb-1">레벨: {currentLevel}</p>

                {/** 경험치 진행 바 */}
                <div
                    className="progress w-75 mx-auto"
                    style={{ height: "20px" }}
                >
                    {(() => {
                        const totalForNext =
                            getTotalExpForNextLevel(currentLevel);
                        const percent = Math.min(
                            Math.floor((currentExp / totalForNext) * 100),
                            100
                        );
                        return (
                            <div
                                className="progress-bar bg-success"
                                role="progressbar"
                                style={{ width: `${percent}%` }}
                                aria-valuenow={percent}
                                aria-valuemin="0"
                                aria-valuemax="100"
                            >
                                {currentExp} / {totalForNext}
                            </div>
                        );
                    })()}
                </div>

                {/** 디버그용: 클릭 시 경험치 +10 (루틴 입력 시 여기를 호출) */}
                <button
                    className="btn btn-primary btn-sm mt-3"
                    onClick={() => addExpToSelected(10)}
                >
                    +10 EXP
                </button>
            </div>

            {/** ================================== 
          2) 하단: 모든 캐릭터 카드 그리드
      ==================================== **/}
            <div className="container">
                <div className="row gy-3 gx-2 justify-content-center">
                    {CHARACTER_LIST.map((char) => {
                        const exp = charExpMap[char.id] || 0;
                        const lvl = charLevelMap[char.id] || 1;
                        const isSelected = char.id === selectedCharId;

                        return (
                            <div
                                key={char.id}
                                className="col-6 col-md-4 col-lg-2"
                            >
                                <div
                                    className={
                                        "card h-100 text-center " +
                                        (isSelected ? "border-primary" : "")
                                    }
                                    style={{ cursor: "pointer" }}
                                    onClick={() => setSelectedCharId(char.id)}
                                >
                                    <img
                                        src={char.img}
                                        className="card-img-top"
                                        alt={char.name}
                                        style={{
                                            padding: "0.5rem",
                                            height: "120px",
                                            objectFit: "contain",
                                        }}
                                    />
                                    <div className="card-body px-1 py-2">
                                        <h6 className="card-title mb-1">
                                            {char.name}
                                        </h6>
                                        <p className="mb-1">LV. {lvl}</p>
                                        {/** 작은 경험치 바 */}
                                        <div
                                            className="progress"
                                            style={{ height: "8px" }}
                                        >
                                            {(() => {
                                                const totalForNext =
                                                    getTotalExpForNextLevel(
                                                        lvl
                                                    );
                                                const pct = Math.min(
                                                    Math.floor(
                                                        (exp / totalForNext) *
                                                            100
                                                    ),
                                                    100
                                                );
                                                return (
                                                    <div
                                                        className={
                                                            "progress-bar " +
                                                            (pct < 50
                                                                ? "bg-secondary"
                                                                : pct < 75
                                                                ? "bg-info"
                                                                : "bg-success")
                                                        }
                                                        role="progressbar"
                                                        style={{
                                                            width: `${pct}%`,
                                                        }}
                                                        aria-valuenow={pct}
                                                        aria-valuemin="0"
                                                        aria-valuemax="100"
                                                    ></div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
