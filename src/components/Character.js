import React, { useState, useEffect } from "react";

// 미리 정의된 캐릭터 목록 (ID, 이름, 이미지 경로)
const CHARACTER_LIST = [
    { id: "daehonggeun", name: "대흉근", img: "/img/대흉근.png" },
    { id: "daeheehaadu", name: "대퇴사두", img: "/img/대퇴사두.png" },
    { id: "ildungsin", name: "복직근", img: "/img/복직근.png" },
];

export default function Character({ currentUserId }) {
    // 현재 선택된 캐릭터 ID (기본: 첫 번째 캐릭터)
    const [selectedCharId, setSelectedCharId] = useState(CHARACTER_LIST[0].id);
    // { [charId]: level } 형태로 캐릭터별 레벨만 저장
    const [levelMap, setLevelMap] = useState({});

    // “레벨업에 필요한 프로틴” 계산: 현재 레벨 n → 필요 프로틴 = n
    const getRequiredProtein = (level) => level;

    // localStorage 키: 캐릭터 레벨 → "level-<userId>-<charId>"
    const getLevelKey = (userId, charId) => `level-${userId}-${charId}`;
    // localStorage 키: 유저 전체 EXP 풀 → "userExp-<userId>"
    const getUserExpKey = (userId) => `userExp-${userId}`;

    // 현재 유저 전체 EXP 풀 값을 가져오는 함수
    const getUserExp = () => {
        if (!currentUserId) return 0;
        const key = getUserExpKey(currentUserId);
        return parseInt(localStorage.getItem(key) || "0", 10);
    };

    // localStorage에서 “level-<userId>-<charId>”들을 읽어와 levelMap을 구성
    const loadAllLevels = () => {
        if (!currentUserId) {
            setLevelMap({});
            return;
        }
        const map = {};
        CHARACTER_LIST.forEach(({ id }) => {
            const levelKey = getLevelKey(currentUserId, id);
            const storedLevel = parseInt(
                localStorage.getItem(levelKey) || "1",
                10
            );
            map[id] = storedLevel;
        });
        setLevelMap(map);
    };

    // 마운트되거나 currentUserId가 바뀔 때마다 레벨 정보를 로드
    useEffect(() => {
        loadAllLevels();
    }, [currentUserId]);

    // 선택된 캐릭터의 레벨업 처리 함수
    const handleLevelUp = () => {
        const userExpKey = getUserExpKey(currentUserId);
        const prevUserExp = getUserExp();

        const prevLevel = levelMap[selectedCharId] || 1;
        const required = getRequiredProtein(prevLevel);

        if (prevUserExp < required) {
            alert("프로틴이 부족합니다! 루틴을 더 기록하세요.");
            return;
        }

        // 레벨업
        const nextLevel = prevLevel + 1;
        const nextUserExp = prevUserExp - required;

        // 로컬스토리지 업데이트
        const levelKey = getLevelKey(currentUserId, selectedCharId);
        localStorage.setItem(levelKey, nextLevel);
        localStorage.setItem(userExpKey, nextUserExp);

        // React 상태 동기화
        setLevelMap((prev) => ({
            ...prev,
            [selectedCharId]: nextLevel,
        }));
    };

    // 현재 선택된 캐릭터 정보
    const selectedCharInfo = CHARACTER_LIST.find(
        (c) => c.id === selectedCharId
    );
    const currentLevel = levelMap[selectedCharId] || 1;
    const userExp = getUserExp();
    const requiredProteinForNext = getRequiredProtein(currentLevel);

    return (
        <div className="text-center">
            {/** ==========================
                상단: 선택된 캐릭터 큰 뷰
            =========================== **/}
            <div className="mb-4">
                <img
                    src={selectedCharInfo.img}
                    alt={selectedCharInfo.name}
                    className="img-fluid"
                    style={{ width: "200px" }}
                />
                <h3 className="mt-2">{selectedCharInfo.name}</h3>
                <p className="h5 mb-1">LV. {currentLevel}</p>

                {/** 프로틴 현황 버튼: {userExp}/{requiredProteinForNext} 
                    레벨업 가능하면 파란색(btn-primary), 불가능하면 회색(btn-secondary) **/}
                <button
                    className={
                        "btn " +
                        (userExp >= requiredProteinForNext
                            ? "btn-primary"
                            : "btn-secondary")
                    }
                    onClick={handleLevelUp}
                >
                    레벨업 {userExp} / {requiredProteinForNext}
                </button>
            </div>

            {/** ===============================
                하단: 캐릭터 카드 그리드 목록
            =============================== **/}
            <div className="container">
                <div className="row gy-3 gx-2 justify-content-center">
                    {CHARACTER_LIST.map((char) => {
                        const lvl = levelMap[char.id] || 1;
                        const reqProt = getRequiredProtein(lvl);
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
                                        <small className="text-muted">
                                            {userExp} / {reqProt}
                                        </small>
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
