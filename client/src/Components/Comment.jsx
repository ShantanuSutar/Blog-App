const Comment = ({ c }) => {
  const { comment, username, img: userImg } = c;
  console.log(userImg);
  return (
    <div className="comment">
      <div className="user">
        <div className="userImg">
          {userImg ? (
            <img src={userImg} alt="" />
          ) : (
            <img
              src="https://t4.ftcdn.net/jpg/02/29/75/83/360_F_229758328_7x8jwCwjtBMmC6rgFzLFhZoEpLobB6L8.jpg"
              alt=""
            />
          )}
        </div>

        {/* user image or random image */}

        <div className="userInfo">
          <span>{username}</span>
          <p>{comment}</p>
        </div>
      </div>
    </div>
  );
};

export default Comment;
