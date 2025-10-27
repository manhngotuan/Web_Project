import React from "react";
import './Hero.css'
import hand_icon from '../Assets/hand_icon.png'
import arrow_icon from '../Assets/arrow.png'
import hero_image from '../Assets/hero_image.png'



const Hero = () => {

    const scrollToPosition = () => {
        window.scrollTo(0, 2600);
    }

    return (
        <div className="hero">
            <div className="hero-left">
                <h2>Hàng mới về</h2>
                <div>
                    <div className="hero-hand-icon">
                        <p>Mới</p>
                        <img src={hand_icon} alt="" />
                    </div>
                    <p>Bộ sưu tập</p>
                    <p>Dành cho mọi người</p>
                </div>
                <div className="hero-latest-btn">
                    <div onClick={scrollToPosition}>Bộ sưu tập mới nhất</div>
                    <img src={arrow_icon} alt=""/>
                </div>
            </div>
            <div className="hero-right">
                <img src = {hero_image} alt=""/>
            </div>
        </div>
    )
}

export default Hero