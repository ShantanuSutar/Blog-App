import { BiSolidEdit } from "react-icons/bi";
import { AiFillDelete } from "react-icons/ai";
import { Link } from "react-router-dom";
import Menu from "../Components/Menu";
const Single = () => {
  return (
    <div className="single">
      <div className="content">
        <img
          src="https://images.unsplash.com/photo-1697014960838-7f0d01539bcf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1887&q=80"
          alt=""
        />
        <div className="user">
          <img
            src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fHBlcnNvbnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60"
            alt=""
          />
          <div className="info">
            <span>John</span>
            <p>Posted 2 days ago</p>
          </div>
          <div className="edit">
            <Link to={"/write?edit=2"}>
              <BiSolidEdit />
            </Link>
            <AiFillDelete />
          </div>
        </div>
        <h1>Lorem ipsum dolor sit amet consectetur adipisicing elit. </h1>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Laudantium
          praesentium autem nobis magnam nihil doloremque sint odio explicabo
          iste molestias impedit deleniti dicta sapiente, labore fugiat corporis
          magni sit similique. Lorem ipsum dolor sit amet consectetur
          adipisicing elit. Veniam quibusdam fugit, expedita fugiat, praesentium
          deserunt natus numquam reprehenderit quo magni omnis dolorum hic.
          <br />
          <br />
          Quam, blanditiis beatae placeat dolores voluptates pariatur! Sint
          quidem enim rerum ea quis nesciunt dolorem consectetur, provident
          optio, officia esse ex et laboriosam quo neque quas adipisci!
          Provident ullam architecto natus doloribus assumenda soluta, et
          deserunt laboriosam. Commodi doloremque minus quaerat dolorum
          <br />
          <br />
          voluptatem ut atque explicabo ducimus perferendis voluptatum illum
          porro eum sequi quasi quam distinctio nisi odio laboriosam placeat
          doloribus, dignissimos amet facilis, voluptate nesciunt! Tempora. Fuga
          commodi minima enim sapiente tempore reprehenderit ullam nobis
          mollitia est ducimus aperiam iste illum quos debitis inventore, veniam
          <br />
          <br />
          temporibus eum tenetur. Labore dolores totam necessitatibus quae nulla
          fugiat fuga. Doloribus ad consequatur esse alias reiciendis optio
          culpa quisquam repellat ut possimus? Tempora, maxime officiis.
          Inventore ipsum exercitationem illo perferendis dicta! Quisquam sint
          quia repudiandae nisi, modi eos obcaecati nam.
        </p>
      </div>
      <div className="menu">
        <Menu />
      </div>
    </div>
  );
};

export default Single;
