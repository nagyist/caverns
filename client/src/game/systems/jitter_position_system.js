var JitterPositionSystem = new Class({Extends:System,

  initialize:function()
  {
    this.parent();
    this.nodeList = this.createNodeList({
      transform:TransformComponent
    });
  },

  update:function(dT)
  {
    this.nodeList.forEachNode(function(node) {
      node.transform.position.x += Math.random()*2-1;
      node.transform.position.y += Math.random()*2-1;
    });
  }

});